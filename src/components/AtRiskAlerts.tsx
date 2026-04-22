import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getAtRiskClients } from "@/lib/insights";
import { useSheetData } from "@/hooks/useSheetData";
import { useUserSettings } from "@/hooks/useUserSettings";

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

  if (!data) return null;
  const atRisk = getAtRiskClients(data.clients, data.merHistory, data.cycleEntries, thresholds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-destructive/15 bg-card shadow-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-destructive/[0.03] hover:bg-destructive/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-left min-w-0">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
              At-Risk Clients
              {atRisk.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  {atRisk.length}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground break-words">
              Auto-flagged based on patterns. Tune thresholds in <Link to="/settings" className="text-primary hover:underline">Settings</Link>.
            </p>
          </div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {atRisk.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No clients currently flagged as at-risk.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
                {atRisk.slice(0, 12).map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="px-4 sm:px-6 py-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <p className="text-sm font-medium text-foreground break-words">{c.name}</p>
                          <span className="text-[10px] text-muted-foreground">· {c.bookkeeper}</span>
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
                      <span className="text-[10px] font-mono-data text-destructive font-semibold shrink-0">
                        sev {c.severity}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {atRisk.length > 12 && (
                  <div className="px-6 py-3 text-center text-[11px] text-muted-foreground">
                    +{atRisk.length - 12} more at-risk clients
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
