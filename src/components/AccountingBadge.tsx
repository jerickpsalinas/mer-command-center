import { CheckCircle2, Clock, CircleDashed } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccountingStatus } from "@/lib/accountingStatus";

/**
 * Accounting (reconciliation) status chip — the "green = our accounting work is done"
 * signal, SEPARATE from the 10-check compliance badge. "Carried" means the month is done
 * only because a later month is reconciled (inferred from the cumulative nature of
 * reconciliation), not because this month's own date was entered.
 */
export default function AccountingBadge({
  status,
  inferred,
  reportingMonth,
  className = "",
}: {
  status: AccountingStatus;
  inferred: boolean;
  reportingMonth?: string;
  className?: string;
}) {
  if (status === "Unknown") return null;

  const done = status === "Reconciled" || status === "Reconciled (carried)";
  const label = status === "Reconciled (carried)" ? "Reconciled ·" : done ? "Reconciled" : "Not Reconciled";
  const Icon = !done ? CircleDashed : inferred ? Clock : CheckCircle2;

  const cls = !done
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : inferred
      ? "bg-success/5 text-success/90 border-success/20 border-dashed"
      : "bg-success/10 text-success border-success/20";

  const tip = !done
    ? `Books are not yet reconciled through ${reportingMonth ?? "this month"}.`
    : inferred
      ? `Reconciled — carried from a later month. A newer month is reconciled, so by accounting rules ${reportingMonth ?? "this month"} is complete too, even though this month's own reconciled date wasn't entered.`
      : `Books reconciled through ${reportingMonth ?? "this month"}.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold uppercase tracking-wider leading-none ${cls} ${className}`}
          aria-label={tip}
        >
          <Icon className="h-2.5 w-2.5" aria-hidden />
          {label}
          {status === "Reconciled (carried)" && <span className="normal-case tracking-normal">carried</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
