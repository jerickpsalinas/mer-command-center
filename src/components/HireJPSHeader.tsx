import { ArrowLeft } from "lucide-react";
import officialLogo from "@/assets/official-logo.png";

export default function HireJPSHeader() {
  if (typeof window !== "undefined" && window.self !== window.top) return null;
  return (
    <header className="sticky top-0 z-[60] border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4">
        <img src={officialLogo} alt="HireJPS Logo" className="h-8 w-auto" />
        <a
          href="https://hirejps.com"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </a>
      </div>
    </header>
  );
}
