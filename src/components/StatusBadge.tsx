import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";
import type { Client } from "@/data/mockData";
import { getComplianceChecks, COMPLIANCE_RULE_SUMMARY } from "@/lib/complianceExplain";

interface StatusBadgeProps {
  status: "Compliant" | "Non-Compliant" | "On Hold" | string;
  className?: string;
  /** When provided alongside a compliance status, a tooltip explains which checks passed/failed. */
  client?: Client;
}

export default function StatusBadge({ status, className, client }: StatusBadgeProps) {
  const base = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold";
  const variants: Record<string, string> = {
    Compliant: "bg-success/10 text-success",
    "Non-Compliant": "bg-destructive/10 text-destructive",
    "On Hold": "bg-warning/10 text-warning",
    Received: "bg-success/10 text-success",
    "Not Received": "bg-destructive/10 text-destructive",
    Yes: "bg-success/10 text-success",
    No: "bg-destructive/10 text-destructive",
  };

  const dots: Record<string, string> = {
    Compliant: "bg-success",
    "Non-Compliant": "bg-destructive",
    "On Hold": "bg-warning",
    Received: "bg-success",
    "Not Received": "bg-destructive",
    Yes: "bg-success",
    No: "bg-destructive",
  };

  const badge = (
    <span className={cn(base, variants[status] || "bg-muted text-muted-foreground", className)}>
      {dots[status] && <span className={cn("h-1.5 w-1.5 rounded-full", dots[status])} />}
      {status}
    </span>
  );

  const isCompliance = status === "Compliant" || status === "Non-Compliant" || status === "On Hold";
  if (!isCompliance) return badge;

  const summary = COMPLIANCE_RULE_SUMMARY[status as "Compliant" | "Non-Compliant" | "On Hold"];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-relaxed p-3">
        <p className="font-semibold text-foreground mb-1">{status}</p>
        <p className="text-muted-foreground mb-2">{summary}</p>
        {client && status !== "On Hold" && (
          <ul className="space-y-1">
            {getComplianceChecks(client).map((c) => (
              <li key={c.label} className="flex items-start gap-1.5">
                {c.passed ? (
                  <Check className="h-3 w-3 mt-0.5 text-success shrink-0" />
                ) : (
                  <X className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                )}
                <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>
                  {c.label}
                  {c.detail !== undefined && (
                    <span className="text-muted-foreground/70"> — {c.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {client && status === "On Hold" && client.status && (
          <p className="text-muted-foreground">
            Sheet status: <span className="text-foreground font-medium">{client.status}</span>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
