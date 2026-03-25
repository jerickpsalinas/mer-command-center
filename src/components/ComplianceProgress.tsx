import { motion } from "framer-motion";

interface ComplianceProgressProps {
  label: string;
  value: number;
  index?: number;
}

export default function ComplianceProgress({ label, value, index = 0 }: ComplianceProgressProps) {
  const color = value >= 90 ? "bg-success" : value >= 70 ? "bg-warning" : "bg-destructive";
  const glowColor = value >= 90 ? "shadow-[0_0_8px_-2px_hsl(160_60%_45%_/_0.3)]" : value >= 70 ? "shadow-[0_0_8px_-2px_hsl(38_85%_55%_/_0.3)]" : "shadow-[0_0_8px_-2px_hsl(0_72%_55%_/_0.3)]";
  const textColor = value >= 90 ? "text-success" : value >= 70 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`text-sm font-mono-data font-semibold ${textColor}`}>{value}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          className={`h-full rounded-full ${color} ${glowColor}`}
        />
      </div>
    </div>
  );
}
