# Staff Portal feed

GET `/functions/v1/portal-feed` with server-side header `x-portal-key`.
Optional `month=YYYY-MM`; omitted means latest month present in MER data.

## Shared key setup

Create one URL-safe random value with at least 32 bytes of entropy using a password manager (or `openssl rand -hex 32`). Save the identical value as `PORTAL_FEED_KEY` in Project Settings → Secrets in both projects. Never put it in browser code, chat, or logs. Generated project secrets cannot be revealed or transferred, so that tool cannot provision a cross-project shared key.

## Response

`{ month, availableMonths, generatedAt, summary, clients, trend, focus, focusCount, outstandingStatements, outstandingStatementsCount }`

Outstanding statements always cover the latest available close month, independently of the optional historical month query. The existing sheet-only population limitation applies: clients absent from MER submissions cannot be included. Excludes On Hold, 100% complete, explicit Completed status, and latest log stage 8/Completed. Includes clients if either statement status or bank transactions is not Received (case-insensitive, trimmed; no broader aliases). Each item contains only id, name, bookkeeper, closeGroup, statementStatus (blank becomes "Not requested"), bankTransactionsStatus, lastReconciledDate, missingSince, dueDate. Dates are YYYY-MM-DD; missingSince uses Statement Requested Date / Statement Request Date / Date Statement Requested / Statement Requested At when valid, otherwise the first of the month following the reporting month (October close starts November 1). Sorted First Close then Second Close, oldest missingSince first. Owner deadlines use the shared focus scheduling.

Focus is the ordered incomplete-work queue with explicit operational fields: id, name, stage, stageLabel, percent, bookkeeper, nextStep, dueDate, daysLate, urgency, closeGroup. First Close owner work is due on the following month's 15th (client reports by the 20th); Second Close owner work is due on the 30th, capped at month end. Edit SECOND_CLOSE_CLIENTS in the shared focus module to maintain the roster; the optional MER sheet Close Group = Second is also honored. Complete Dimensions (including legal-name variants) is currently Second Close.

Summary includes totalClients, compliant, nonCompliant, onHold, pendingMer, avgCompletionPct, financialsSent, booksClosed, docsOutstanding, escalated. Clients include only the requested operational fields; missing cycle fields are null and escalated is false. Trend is the last six available months, using the existing raw-row aggregation.

Completion excludes On Hold and Pending MER exactly as the KPI calculation does. docsOutstanding uses that same active-submitted subset and the existing statement-received check. Escalation is true if any matching month's log entry is escalated, as on the Master Cycle page.

The population here is one MER submission per client for the selected month. The dashboard additionally uses a live GHL mer-workflow roster, exclusions, prior-month rollover, and never-submitted Pending MER placeholders. Those contacts do not exist in the MER JSON, so roster totals and Pending MER cannot be identical from this sheet-only feed; compliance and KPI arithmetic are shared unchanged.

In-memory upstream cache expires after 60 seconds, and fetch plus body parsing has a 30-second timeout. No CORS headers are emitted. Missing/wrong key: 401; non-GET: 405; invalid query: 400; unavailable month: 404; upstream failures: 502/504. Unconfigured key fails closed.

To protect the app's own sheet reads later, route them through a session-validated edge function and remove the browser's direct URL; also revoke/rotate access to the old public Apps Script endpoint so the already-exposed link no longer works.