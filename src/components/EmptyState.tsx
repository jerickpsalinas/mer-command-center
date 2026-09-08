import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, CARD, BTN_SOFT_PRIMARY } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  size?: "sm" | "md";
  variant?: "plain" | "card" | "dashed";
  className?: string;
}

/** Shared empty-state block: icon circle, title, optional hint + soft action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  size = "md",
  variant = "plain",
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2",
        size === "md" ? "px-4 py-12" : "px-4 py-8",
        variant === "card" && CARD,
        variant === "dashed" && "rounded-xl border border-dashed border-border",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center",
          size === "md" ? "h-12 w-12" : "h-10 w-10",
        )}
      >
        <Icon className={cn("text-muted-foreground", size === "md" ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground max-w-sm">{hint}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className={cn(BTN_SOFT_PRIMARY, "mt-1")}>
          {ActionIcon && <ActionIcon className="h-3.5 w-3.5" aria-hidden />}
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
