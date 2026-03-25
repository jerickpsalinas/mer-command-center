import { Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl"
    >
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Configure your MER dashboard preferences, manage team members, and set up notification rules.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-foreground">Organization</span>
              <span>Brant & Associates</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-foreground">Review Period</span>
              <span>July 2025</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-foreground">Bookkeepers</span>
              <span>4 active</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground">Notifications</span>
              <span>Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
