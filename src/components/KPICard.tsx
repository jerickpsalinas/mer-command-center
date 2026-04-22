import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "destructive" | "warning";
  index?: number;
  /** Suffix appended to numeric values (e.g. "%") — used only when value is a number */
  suffix?: string;
}

const variantStyles = {
  default: "border-border",
  success: "border-success/15",
  destructive: "border-destructive/15",
  warning: "border-warning/15",
};

const iconStyles = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  destructive: "text-destructive bg-destructive/10",
  warning: "text-warning bg-warning/10",
};

const valueStyles = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
};

export default function KPICard({ title, value, icon: Icon, trend, variant = "default", index = 0, suffix }: KPICardProps) {
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group rounded-xl border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 hover:border-primary/15",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
          iconStyles[variant]
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={cn("text-[28px] font-bold font-mono-data leading-none", valueStyles[variant])}>
        {isNumeric ? <AnimatedNumber value={value} suffix={suffix ?? ""} /> : value}
      </p>
      {trend && <p className="mt-2 text-xs text-muted-foreground">{trend}</p>}
    </motion.div>
  );
}
