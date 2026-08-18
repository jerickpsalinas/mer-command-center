import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Loader2 } from "lucide-react";
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
          <BrandMark className="h-12 w-12 mb-4" />
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

          <div className="text-[11px] text-muted-foreground text-center pt-2 space-y-1 border-t border-border/50 mt-2">
            <p className="font-semibold uppercase tracking-wider text-[10px] mt-3">Demo Credentials</p>
            <p>Email: <span className="font-mono text-foreground">{DEMO_EMAIL}</span></p>
            <p>Password: <span className="font-mono text-foreground">{DEMO_PASSWORD}</span></p>
          </div>
        </form>
      </div>
      </div>
      <HireJPSFooter />
    </div>
  );
}
