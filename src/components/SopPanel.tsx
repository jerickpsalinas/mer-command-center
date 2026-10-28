import { useState } from "react";
import { HelpCircle, Download, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn, FOCUS_RING } from "@/lib/utils";
import { toast } from "sonner";
import { downloadSopPdf } from "@/lib/sopPdf";
import { allSops } from "@/data/sopConfigs";

export interface SopSection {
  heading: string;
  content: string;
}

export interface SopConfig {
  /** Page title shown at the top of the panel */
  title: string;
  /** Brief one-liner about what the page does */
  subtitle?: string;
  /** Structured SOP sections */
  sections: SopSection[];
  /** Google Drive file ID for the downloadable PDF (optional) */
  pdfFileId?: string;
}

/**
 * A small help-circle button that opens a slide-out panel with the page's
 * SOP content and an optional download link to the full PDF guide.
 *
 * Usage:
 *   <SopPanel config={dashboardSop} />
 */
export default function SopPanel({ config, className }: { config: SopConfig; className?: string }) {
  const [open, setOpen] = useState(false);
  const handleDownload = (configs: SopConfig[], label: string) => {
    try {
      const name = downloadSopPdf(configs, { manualTitle: "Brant & Associates MER Dashboard" });
      toast.success(`${label} downloaded: ${name}`);
    } catch {
      toast.error("Could not generate the SOP PDF");
    }
  };
  const viewUrl = config.pdfFileId
    ? `https://drive.google.com/file/d/${config.pdfFileId}/view`
    : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`SOP for ${config.title}`}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-card hover:bg-accent hover:text-foreground transition-colors duration-150",
            FOCUS_RING,
            className,
          )}
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">SOP</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border mb-4">
          <SheetTitle className="text-lg">{config.title} — SOP</SheetTitle>
          {config.subtitle && (
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          )}
        </SheetHeader>

        <div className="space-y-5 text-sm text-foreground leading-relaxed">
          {config.sections.map((s) => (
            <div key={s.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {s.heading}
              </h3>
              <div className="whitespace-pre-line">{s.content}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDownload([config], "SOP")}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors duration-150",
              FOCUS_RING,
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            This SOP (PDF)
          </button>
          <button
            type="button"
            onClick={() => handleDownload(allSops, "Full SOP manual")}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150",
              FOCUS_RING,
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Full manual
          </button>
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150",
                FOCUS_RING,
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Full guide
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
