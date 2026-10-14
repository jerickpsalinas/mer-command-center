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
  const pdfUrl = config.pdfFileId
    ? `https://drive.google.com/uc?export=download&id=${config.pdfFileId}`
    : null;
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
            "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-card hover:bg-accent hover:text-foreground transition-colors duration-150",
            FOCUS_RING,
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
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

        {(pdfUrl || viewUrl) && (
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150",
                  FOCUS_RING,
                )}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download PDF
              </a>
            )}
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150",
                  FOCUS_RING,
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                View Full Guide
              </a>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
