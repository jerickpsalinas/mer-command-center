import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, ChevronRight } from "lucide-react";
import PdfViewerModal from "@/components/PdfViewerModal";

interface Guide {
  id: string;
  title: string;
  description: string;
  fileId: string;
}

const guides: Guide[] = [
  {
    id: "dashboard-action-buttons",
    title: "Dashboard Action Buttons",
    description:
      "Standard Operating Procedure for the action buttons in the client details modal — bank reconnection, statement requests, and notes approval.",
    fileId: "1cGAXyRDqplCmXB2ZbyefwBkFNimIVdyL",
  },
];

export default function UserGuidePage() {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-[12px] font-medium uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" />
          User Guide
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight text-balance">
          Internal procedures & how-to documents
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-2xl">
          Open any guide below to read the full document. Use the download button inside the viewer to save a copy.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {guides.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            onClick={() => setActive(g)}
            className="group text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)] transition-[box-shadow,border-color] focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-base font-semibold text-foreground truncate">
                    {g.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                  {g.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                  PDF · Click to open
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <PdfViewerModal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        fileId={active?.fileId ?? ""}
      />
    </div>
  );
}
