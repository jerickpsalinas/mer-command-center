import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, OVERLINE } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

/**
 * Page-level header (title + description + actions). Renders an <h2> because
 * AppLayout owns the page <h1> in the top bar.
 */
export function PageHeader({ title, description, eyebrow, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className={cn(OVERLINE, "mb-1")}>{eyebrow}</p>}
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" aria-hidden />}
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
