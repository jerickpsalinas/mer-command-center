import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Loader2, KeyRound, Copy, Check } from "lucide-react";
import HireJPSHeader from "@/components/HireJPSHeader";
import HireJPSFooter from "@/components/HireJPSFooter";
import FloatingParticles from "@/components/FloatingParticles";

const DEMO_EMAIL = "demo@greenfieldbk.com";
const DEMO_PASSWORD = "demo2025";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAutofill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (localStorage.getItem("greenfield-demo-logged-in") === "true") {
      navigate("/", { replace: true });
    }
  }, [navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      localStorage.setItem("greenfield-demo-logged-in", "true");
      navigate("/", { replace: true });
      return;
    }
    setError("Invalid email or password");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background vignette">
      <FloatingParticles />
      <HireJPSHeader />
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          {window.self === window.top && <BrandMark className="h-12 w-12 mb-4" />}
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">Greenfield Bookkeeping</h1>
          <p className="text-sm text-muted-foreground mt-1">Command Center Portal · Demo</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel border border-border rounded-2xl p-7 space-y-5 shadow-elegant"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              placeholder="••••••••"
              autoComplete="current-password"
            />
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
            Sign In
          </button>

          <div className="relative mt-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Demo Access</span>
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
            </div>
          </div>
        </form>
      </div>
      </div>
      <HireJPSFooter />
    </div>
  );
}
