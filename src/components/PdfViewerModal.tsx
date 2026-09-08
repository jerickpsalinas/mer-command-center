import { X, Download, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  fileId: string;
}

/**
 * Full-screen PDF viewer modal that embeds a Google Drive file.
 * Provides close (X), download and open-in-Drive buttons in the header.
 */
export default function PdfViewerModal({ open, onClose, title, fileId }: Props) {
  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  const openUrl = `https://drive.google.com/file/d/${fileId}/view`;
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [open, fileId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header className="flex items-center gap-3 h-[56px] px-4 sm:px-6 border-b border-border glass-panel shrink-0">
            <h2
              className="font-display text-[15px] sm:text-base font-semibold text-foreground truncate min-w-0"
              title={title}
            >
              {title}
            </h2>
            <div className="flex-1" />
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title="Open in Google Drive"
              aria-label="Open in Google Drive (opens in a new tab)"
            >
              <ExternalLink className="h-[16px] w-[16px]" aria-hidden="true" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`${title}.pdf`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title="Download PDF"
              aria-label="Download PDF"
            >
              <Download className="h-[16px] w-[16px]" aria-hidden="true" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title="Close (Esc)"
              aria-label="Close viewer"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </header>
          <div className="flex-1 min-h-0 bg-muted/40 relative">
            {!loaded && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                <p className="text-[13px] text-muted-foreground">Loading document…</p>
                {slow && (
                  <p className="text-[12px] text-muted-foreground max-w-sm">
                    Still blank? Your browser may be blocking the Google Drive embed
                    (third-party cookies). Use <span className="text-foreground">Open in Drive</span> or{" "}
                    <span className="text-foreground">Download</span> above.
                  </p>
                )}
              </div>
            )}
            <iframe
              key={fileId}
              src={previewUrl}
              title={title}
              onLoad={() => setLoaded(true)}
              className="w-full h-full border-0 relative"
              allow="autoplay"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
