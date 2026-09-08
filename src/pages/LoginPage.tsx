import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Loader2, KeyRound, Copy, Check, Eye, EyeOff } from "lucide-react";
import HireJPSHeader from "@/components/HireJPSHeader";
import HireJPSFooter from "@/components/HireJPSFooter";
import FloatingParticles from "@/components/FloatingParticles";
import { useAuth, DEMO_LOGIN_KEY, DEMO_AUTH_EVENT } from "@/hooks/useAuth";

const DEMO_EMAIL = "demo@merdashboard.app";
const DEMO_PASSWORD = "demo2025";

/** Shared auth-form input class (kept for ResetPasswordPage import compatibility). */
export const AUTH_INPUT_CLASS =
  "w-full h-11 px-4 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition";

export default function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const handleAutofill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 450));
    setSubmitting(false);
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      try {
        localStorage.setItem(DEMO_LOGIN_KEY, "true");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
      navigate("/", { replace: true });
      return;
    }
    setError("Invalid email or password. Use the demo credentials below.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background vignette overflow-x-clip">
      <FloatingParticles />
      <HireJPSHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8 text-center">
            {!isEmbedded && <BrandMark className="h-12 w-12 mb-4" />}
            <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
              MER Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly End Review Dashboard · Live Demo
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-panel border border-border rounded-2xl p-7 space-y-5 shadow-elegant"
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-4 pr-11 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In to Demo
            </button>

            <div className="relative mt-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                    Demo Access
                  </span>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                  <span className="text-muted-foreground font-medium">Email</span>
                  <span className="font-mono text-foreground/90 select-all">{DEMO_EMAIL}</span>
                  <span className="text-muted-foreground font-medium">Password</span>
                  <span className="font-mono text-foreground/90 select-all">{DEMO_PASSWORD}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="w-full h-8 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/20 hover:border-primary/50 transition-all"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Filled!" : "Quick Fill Credentials"}
                </button>
                <p className="text-[11px] leading-relaxed text-muted-foreground/80 text-center pt-0.5">
                  All figures, clients, and people shown are fictional sample data.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
      <HireJPSFooter />
    </div>
  );
}
