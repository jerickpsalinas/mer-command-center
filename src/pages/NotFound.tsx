import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn, FOCUS_RING } from "@/lib/utils";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background vignette px-4">
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="MER Command Center" className="h-12 w-12 rounded-xl object-contain mb-4" />
          <p className="text-sm text-muted-foreground">MER Command Center MER Dashboard</p>
        </div>

        <div className="glass-panel border border-border rounded-2xl p-7 shadow-elevated text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="font-mono-data text-xs font-medium uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <Link
            to="/"
            className={cn("inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors duration-150", FOCUS_RING)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
