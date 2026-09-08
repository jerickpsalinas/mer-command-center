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
    id: "getting-started",
    title: "Getting Started",
    description:
      "Dashboard orientation guide — navigation, roles, what each tab does, and how to use the top nav buttons.",
    fileId: "1hZGY3YngqH-jeL5pP9kEyNxEQj8bGLKY",
  },
  {
    id: "mer-workflow",
    title: "MER Workflow Guide",
    description:
      "Complete MER lifecycle — Add MER, Update MER, docs-received gate, review gate, cycle progression tracker, Submit for Review, and Mark as Approved.",
    fileId: "118ujg4Rt58LPY_UeaqQLtdk_5tzkM_dZ",
  },
  {
    id: "action-buttons-sop",
    title: "Dashboard Action Buttons",
    description:
      "Standard Operating Procedure v2.0 — the four action slots (bank reconnection, statement request, notes approval, document request), warnings, errors, and the sequence status table.",
    fileId: "17KswnuOqYVFKHZ_mP12xRuluyrqXLS2J",
  },
  {
    id: "admin-guide",
    title: "Admin Guide — Cycle & Tags",
    description:
      "For admin and developer roles — Master Bookkeeping Cycle pipeline, jessica-approved approval, GHL Active Clients tag management, mutual exclusion, and protected tags.",
    fileId: "1VyHxw-Mm4-hTXU9GZ-9Zy0SWTNuYJfxt",
  },
  {
    id: "remove-client-from-mer",
    title: "Removing a Client from MER",
    description:
      "How to take a client out of the MER workflow — the Remove from MER action in GHL Active Clients, what the mer-workflow tag controls, and what happens to the Clients tab afterwards.",
    fileId: "10szIlYqbb5Tfo4wFJQWAx2ivkx4y8soy",
  },
  {
    id: "ghl-active-clients",
    title: "GHL Active Clients Guide",
    description:
      "Full guide to the GHL Active Clients tab — category tags, cycle tags, automation signals, row actions (Edit Tags, Remove from MER), filtering, auditing, and troubleshooting.",
    fileId: "1XvLMb__OqctBgXOqCjIPKZN1O96I_WZI",
  },
];


export default function UserGuidePage() {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
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
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            onClick={() => setActive(g)}
            aria-label={`Open ${g.title} (PDF)`}
            className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover transition-[box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display text-base font-semibold text-foreground truncate" title={g.title}>
                    {g.title}
                  </h2>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                  {g.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    PDF
                  </span>
                  Click to open
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
