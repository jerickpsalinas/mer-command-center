import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "destructive" | "warning";
  index?: number;
}

const variantStyles = {
  default: "border-border hover:border-primary/20",
  success: "border-success/15 hover:border-success/30",
  destructive: "border-destructive/15 hover:border-destructive/30",
  warning: "border-warning/15 hover:border-warning/30",
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

const glowStyles = {
  default: "group-hover:shadow-[0_0_20px_-4px_hsl(38_55%_55%_/_0.12)]",
  success: "group-hover:shadow-[0_0_20px_-4px_hsl(160_60%_45%_/_0.12)]",
  destructive: "group-hover:shadow-[0_0_20px_-4px_hsl(0_72%_55%_/_0.12)]",
  warning: "group-hover:shadow-[0_0_20px_-4px_hsl(38_85%_55%_/_0.12)]",
};

export default function KPICard({ title, value, icon: Icon, trend, variant = "default", index = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group relative rounded-xl border bg-card p-5 shadow-card transition-all duration-300 shimmer overflow-hidden",
        variantStyles[variant],
        glowStyles[variant]
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            iconStyles[variant]
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className={cn("text-[28px] font-bold font-mono-data leading-none", valueStyles[variant])}>{value}</p>
        {trend && <p className="mt-2 text-xs text-muted-foreground">{trend}</p>}
      </div>
    </motion.div>
  );
}
