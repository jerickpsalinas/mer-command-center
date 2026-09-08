import { cn, FOCUS_RING, PILL } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, X } from "lucide-react";
import type { Client } from "@/data/mockData";
import { getComplianceChecks, COMPLIANCE_RULE_SUMMARY } from "@/lib/complianceExplain";

interface StatusBadgeProps {
  status: "Compliant" | "Non-Compliant" | "On Hold" | "Pending MER" | "Pending Verification" | string;
  className?: string;
  /** When provided alongside a compliance status, a popover explains which checks passed/failed. */
  client?: Client;
}

const BASE = cn(PILL, "gap-1.5 transition-colors");

const VARIANTS: Record<string, string> = {
  Compliant: "bg-success/10 text-success border-success/20",
  "Non-Compliant": "bg-destructive/10 text-destructive border-destructive/20",
  "On Hold": "bg-warning/10 text-warning border-warning/20",
  "Pending MER": "bg-muted text-muted-foreground border-border",
  "Pending Verification": "bg-warning/10 text-warning border-warning/20",
  Received: "bg-success/10 text-success border-success/20",
  "Not Received": "bg-destructive/10 text-destructive border-destructive/20",
  Yes: "bg-success/10 text-success border-success/20",
  No: "bg-destructive/10 text-destructive border-destructive/20",
};

const DOTS: Record<string, string> = {
  Compliant: "bg-success",
  "Non-Compliant": "bg-destructive",
  "On Hold": "bg-warning",
  "Pending MER": "bg-muted-foreground",
  "Pending Verification": "bg-warning",
  Received: "bg-success",
  "Not Received": "bg-destructive",
  Yes: "bg-success",
  No: "bg-destructive",
};

const FALLBACK_VARIANT = "bg-muted text-muted-foreground border-border";
const FALLBACK_DOT = "bg-muted-foreground/60";

export default function StatusBadge({ status, className, client }: StatusBadgeProps) {
  const isCompliance = status === "Compliant" || status === "Non-Compliant" || status === "On Hold";
  const variant = VARIANTS[status] || FALLBACK_VARIANT;
  const dot = DOTS[status] || FALLBACK_DOT;

  const inner = (
    <>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {status}
    </>
  );

  if (!isCompliance) {
    return (
      <span className={cn(BASE, variant, className)} title={status} aria-label={status}>
        {inner}
      </span>
    );
  }

  const summary = COMPLIANCE_RULE_SUMMARY[status as "Compliant" | "Non-Compliant" | "On Hold"];

  return (
    <Popover>
      <PopoverTrigger
        asChild
        // Prevent triggering row-level onClicks (e.g. opening the client modal).
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title={`${status} — click for details`}
          aria-label={`${status}. Why is this ${status}?`}
          className={cn(
            BASE,
            variant,
            className,
            "cursor-pointer hover:brightness-110",
            FOCUS_RING,
          )}
        >
          {inner}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-w-xs text-xs leading-relaxed p-3"
        // Don't steal focus from the underlying page when the popover opens
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="font-semibold text-foreground mb-1">{status}</p>
        <p className="text-muted-foreground mb-2">{summary}</p>
        {client && status !== "On Hold" && (
          <ul className="space-y-1">
            {getComplianceChecks(client).map((c) => (
              <li key={c.label} className="flex items-start gap-1.5">
                {c.passed ? (
                  <Check aria-hidden="true" className="h-3 w-3 mt-0.5 text-success shrink-0" />
                ) : (
                  <X aria-hidden="true" className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                )}
                <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>
                  <span className="sr-only">{c.passed ? "Passed: " : "Failed: "}</span>
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
      </PopoverContent>
    </Popover>
  );
}
