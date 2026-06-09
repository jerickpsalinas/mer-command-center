import { useMemo, useState } from "react";
import { Search, UserCheck, X } from "lucide-react";
import { useSheetData } from "@/hooks/useSheetData";

export default function GhlActiveClientsPage() {
  const { data, isLoading } = useSheetData();
  const [search, setSearch] = useState("");

  const clients = data?.clients ?? [];

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...clients].sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((c: any) => c.name.toLowerCase().includes(q));
  }, [clients, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Active Clients — Aug 2025
          </h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "…" : `${sorted.length} of ${clients.length} clients`}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Demo Mode — showing {clients.length} active Greenfield Bookkeeping clients from the Aug 2025 cycle.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Bookkeeper</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Completion</th>
                <th className="px-4 py-3 font-semibold">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((c: any) => (
                <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.clientType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.bookkeeper}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.completionPct}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                      c.complianceStatus === "Compliant"
                        ? "bg-success/15 text-success border-success/30"
                        : c.complianceStatus === "On Hold"
                        ? "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    }`}>
                      {c.complianceStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No clients match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
