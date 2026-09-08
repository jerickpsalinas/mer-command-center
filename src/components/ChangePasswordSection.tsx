import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLogger";
import { Label } from "@/components/ui/label";
import { cn, CARD, CARD_HEADER, CARD_TITLE, OVERLINE, FOCUS_RING } from "@/lib/utils";

export default function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Both fields are required");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      void logActivity({
        action: "password-change",
        clientName: "—",
        page: "Settings",
        details: "User changed their password",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const inputClass = cn(
    "w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground transition-colors duration-150",
    FOCUS_RING,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className={cn(CARD, "overflow-hidden")}
    >
      <div className={CARD_HEADER}>
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className={CARD_TITLE}>Change Password</h2>
          <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="divide-y divide-border" autoComplete="on" noValidate>
        <div className="px-6 py-4 space-y-4">
          <p className={OVERLINE}>
            Credentials
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground">
              New Password <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={tooShort || undefined}
              aria-describedby={tooShort ? "new-password-error" : undefined}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
            {tooShort && (
              <p id="new-password-error" className="text-xs text-destructive">
                Password must be at least 8 characters.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground">
              Confirm New Password <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={mismatch || undefined}
              aria-describedby={mismatch ? "confirm-password-error" : undefined}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
            {mismatch && (
              <p id="confirm-password-error" className="text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-2 bg-muted/20">
          <button
            type="submit"
            disabled={busy}
            className={cn("inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50", FOCUS_RING)}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
