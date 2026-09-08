import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, AlertCircle, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getAtRiskClients } from "@/lib/insights";
import { useSheetData } from "@/hooks/useSheetData";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useClientCommentActivity, markCommentsSeen } from "@/hooks/useClientCommentActivity";
import { cn, CARD_TITLE, FOCUS_RING, FOCUS_RING_INSET } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

const REASON_LABEL: Record<string, string> = {
  consecutiveNonCompliant: "Consecutive non-compliant",
  decliningCompletion: "Declining completion",
  stuckInStage: "Stuck in stage",
  lowCompletion: "Low completion",
};

export default function AtRiskAlerts() {
  const { data } = useSheetData();
  const { thresholds } = useUserSettings();
  const [expanded, setExpanded] = useState(true);
  const { open: openClient, modal: clientModal } = useClientDetails();

  const atRisk = useMemo(
    () => (data ? getAtRiskClients(data.clients, data.merHistory, data.cycleEntries, thresholds) : []),
    [data, thresholds],
  );

  const nameToContactId = useMemo(() => {
    const m = new Map<string, string>();
    if (!data) return m;
    for (const c of data.clients) {
      const id = (c as { ghlContactId?: string }).ghlContactId;
      if (id) m.set(c.name, id);
    }
    return m;
  }, [data]);

  const contactIds = useMemo(
    () => atRisk.map((c) => nameToContactId.get(c.name) || "").filter(Boolean),
    [atRisk, nameToContactId],
  );
  const activity = useClientCommentActivity(contactIds);

  const toggle = () => setExpanded((v) => !v);

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-destructive/15 bg-card shadow-card overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-destructive/[0.03]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
          </div>
          <div className="text-left min-w-0 flex-1">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              className={cn("flex-1 text-left w-full rounded-md", FOCUS_RING)}
            >
              <h3 className={cn(CARD_TITLE, "flex-wrap")}>
                At-Risk Clients
                {atRisk.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold font-mono-data tabular-nums text-destructive">
                    {atRisk.length}
                  </span>
                )}
              </h3>
            </button>
            <p className="text-[11px] text-muted-foreground break-words">
              Auto-flagged based on patterns. Tune thresholds in <Link to="/settings" className="text-primary hover:underline underline-offset-2 transition-colors duration-150">Settings</Link>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse at-risk clients" : "Expand at-risk clients"}
          className={cn("inline-flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 shrink-0", FOCUS_RING)}
        >
          {expanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {atRisk.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                size="sm"
                title="No at-risk clients"
                hint="Nothing matches the current risk thresholds"
              />
            ) : (
              <div className="divide-y divide-border max-h-[320px] overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                {atRisk.slice(0, 12).map((c, i) => {
                  const contactId = nameToContactId.get(c.name) || "";
                  const act = contactId ? activity.get(contactId) : undefined;
                  const unseen = act?.unseen ?? 0;
                  return (
                  <motion.button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      if (contactId) markCommentsSeen(contactId);
                      openClient(c.name);
                    }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    aria-label={`Open details for ${c.name}`}
                    className={cn("w-full text-left px-4 sm:px-6 py-3 hover:bg-accent/30 transition-colors duration-150 block", FOCUS_RING_INSET)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-hidden />
                          <p className="text-sm font-medium text-foreground truncate max-w-full" title={c.name}>{c.name}</p>
                          <span className="text-[10px] text-muted-foreground truncate" title={c.bookkeeper}>· {c.bookkeeper}</span>
                          {unseen > 0 && (
                            <span
                              title={`${unseen} new comment${unseen === 1 ? "" : "s"} since you last viewed`}
                              className="relative inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary"
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                              </span>
                              <MessageCircle className="h-2.5 w-2.5" aria-hidden />
                              {unseen} new
                            </span>
                          )}
                        </div>
                        <ul className="ml-5 space-y-0.5">
                          {c.reasons.map((r, idx) => (
                            <li key={idx} className="text-[11px] text-muted-foreground break-words">
                              <span className="inline-block rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider mr-1.5">
                                {REASON_LABEL[r.type] ?? r.type}
                              </span>
                              {r.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-[10px] font-mono-data tabular-nums text-destructive font-semibold shrink-0" aria-label={`Severity ${c.severity}`}>
                        sev {c.severity}
                      </span>
                    </div>
                  </motion.button>
                  );
                })}

                {atRisk.length > 12 && (
                  <div className="px-6 py-3 text-center text-[11px] text-muted-foreground tabular-nums">
                    +{atRisk.length - 12} more at-risk clients
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {clientModal}
    </motion.div>
  );
}
