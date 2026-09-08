import { motion } from "framer-motion";

interface ComplianceProgressProps {
  label: string;
  value: number;
  index?: number;
}

export default function ComplianceProgress({ label, value, index = 0 }: ComplianceProgressProps) {
  const color = value >= 90 ? "bg-success" : value >= 70 ? "bg-warning" : "bg-destructive";
  const textColor = value >= 90 ? "text-success" : value >= 70 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground truncate min-w-0" title={label}>{label}</span>
        <span className={`text-sm font-mono-data tabular-nums font-semibold shrink-0 ${textColor}`}>{value}%</span>
      </div>
      <div
        className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
