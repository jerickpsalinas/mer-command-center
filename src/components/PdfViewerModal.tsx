import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  fileId: string;
}

/**
 * Full-screen PDF viewer modal that embeds a Google Drive file.
 * Provides close (X) and download buttons in the header.
 */
export default function PdfViewerModal({ open, onClose, title, fileId }: Props) {
  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

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
            <h2 className="font-display text-[15px] sm:text-base font-semibold text-foreground truncate min-w-0">
              {title}
            </h2>
            <div className="flex-1" />
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[13px] font-medium"
              title="Download PDF"
            >
              <Download className="h-[16px] w-[16px]" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </header>
          <div className="flex-1 min-h-0 bg-black/40">
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full border-0"
              allow="autoplay"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
