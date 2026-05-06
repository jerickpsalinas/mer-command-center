import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { ActionPayload } from "@/services/dashboardActions";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmOverride: (payload: ActionPayload) => void;
  errorType: string | null;
  message: string;
  allowOverride: boolean;
  overridePayload: ActionPayload | null;
  isLoading: boolean;
}

const TITLES: Record<string, string> = {
  DUPLICATE_ACTION: "Already Triggered",
  ALREADY_ACTIVE: "Already Active",
  CONTACT_NOT_FOUND: "Client Not Found",
  VALIDATION_ERROR: "Missing Information",
  NETWORK_ERROR: "Connection Error",
  UNKNOWN_ERROR: "Connection Error",
};

export default function ActionResponseModal({
  open,
  onClose,
  onConfirmOverride,
  errorType,
  message,
  allowOverride,
  overridePayload,
  isLoading,
}: Props) {
  const title = (errorType && TITLES[errorType]) || "Action Failed";
  const isWarning = allowOverride;
  const Icon = isWarning ? AlertTriangle : XCircle;
  const iconCls = isWarning ? "text-warning" : "text-destructive";
  const ringCls = isWarning
    ? "bg-warning/10 ring-warning/20"
    : "bg-destructive/10 ring-destructive/20";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-auto p-5">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ring-1 ${ringCls}`}
            >
              <Icon className={`h-5 w-5 ${iconCls}`} />
            </div>
            <div className="min-w-0 pt-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed break-words">
                {message}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 mt-1 border-t border-border/60">
          {isWarning && allowOverride && overridePayload ? (
            <>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-muted/40 text-foreground border border-border hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmOverride(overridePayload)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-colors disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoading ? "Sending…" : "Send Anyway"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
