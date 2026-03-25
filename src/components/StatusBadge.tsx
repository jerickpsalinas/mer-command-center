import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "Compliant" | "Non-Compliant" | "On Hold" | string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
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

  return (
    <span className={cn(base, variants[status] || "bg-muted text-muted-foreground", className)}>
      {dots[status] && <span className={cn("h-1.5 w-1.5 rounded-full", dots[status])} />}
      {status}
    </span>
  );
}
