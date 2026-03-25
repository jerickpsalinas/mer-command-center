import { clients } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm w-72"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c, i) => {
          const issues = (c.uncategorizedTransactions > 0 ? 1 : 0) +
            (c.bankTransactions.includes("Missing") ? 1 : 0) +
            (c.unappliedPayments > 0 ? 1 : 0) +
            (!c.prevMonthNotesApproved ? 1 : 0);

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.02 }}
              className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.clientType} · {c.bookkeeper}</p>
                </div>
                <StatusBadge status={c.complianceStatus} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Last Reconciled</span>
                  <p className="font-mono-data text-foreground">{c.lastReconciledDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completion</span>
                  <p className="font-mono-data text-foreground">{c.completionPct}%</p>
                </div>
              </div>

              {issues > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{issues} issue{issues > 1 ? "s" : ""} found</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
