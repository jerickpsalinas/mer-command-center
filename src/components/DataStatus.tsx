import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function DataLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-3"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading data from spreadsheet…</p>
    </motion.div>
  );
}

export function DataError({ message }: { message?: string }) {
  // Log technical detail for developers, but never render it to end users.
  if (message && typeof console !== "undefined") {
    console.error("[DataError]", message);
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <p className="text-sm font-medium text-destructive">Failed to load data</p>
      <p className="text-xs text-muted-foreground">
        Data could not be loaded right now. Please check your connection and try again.
      </p>
    </div>
  );
}
