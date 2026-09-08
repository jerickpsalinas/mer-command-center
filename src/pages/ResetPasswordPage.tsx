import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn, FOCUS_RING } from "@/lib/utils";
import { AUTH_INPUT_CLASS } from "@/pages/LoginPage";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery link and emits a PASSWORD_RECOVERY session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/", { replace: true }), 1800);
  };

  const passwordType = showPassword ? "text" : "password";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background vignette px-4">
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="MER Command Center" className="h-12 w-12 rounded-xl object-contain mb-4" />
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">MER Command Center MER Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel border border-border rounded-2xl p-7 space-y-5 shadow-elevated"
          aria-busy={submitting}
        >
          {done ? (
            <div role="status" className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="text-sm text-foreground font-medium">Password updated</p>
              <p className="text-xs text-muted-foreground">Taking you to the dashboard…</p>
            </div>
          ) : (
            <>
              {!ready && (
                <div role="note" className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                  Open this page from the reset link in your email. If you landed here directly, request a
                  new link from the sign-in page.
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    New password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cn("inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors duration-150", FOCUS_RING)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="new-password"
                  name="new-password"
                  type={passwordType}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={AUTH_INPUT_CLASS}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "reset-error" : "password-hint"}
                />
                <p id="password-hint" className="text-[11px] text-muted-foreground">
                  Use at least 8 characters.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={passwordType}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={AUTH_INPUT_CLASS}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "reset-error" : undefined}
                />
              </div>

              {error && (
                <div id="reset-error" role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn("w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", FOCUS_RING)}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitting ? "Updating…" : "Update password"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className={cn("w-full min-h-[40px] rounded-md text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150", FOCUS_RING)}
              >
                Back to sign in
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
