import officialLogo from "@/assets/official-logo.png";

export default function HireJPSFooter() {
  return (
    <footer className="relative z-10 border-t border-border/70 bg-background/80 px-4 sm:px-6 py-8 backdrop-blur-xl shadow-[0_-8px_40px_hsl(0_0%_0%/0.35)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <img
            src={officialLogo}
            alt="HireJPS Logo"
            className="h-8 w-auto"
          />
          <span className="text-xs text-muted-foreground">
            © 2026 HireJPS.com · All Rights Reserved.
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 text-sm font-medium">
          <a
            href="https://hirejps.com/affiliate"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Affiliate Program
          </a>
          <span className="text-muted-foreground/50 mx-1">•</span>
          <a
            href="https://hirejps.com/terms"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>
          <span className="text-muted-foreground/50 mx-1">•</span>
          <a
            href="https://hirejps.com/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-muted-foreground/50 mx-1">•</span>
          <a
            href="https://hirejps.com/refund"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Refund Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
