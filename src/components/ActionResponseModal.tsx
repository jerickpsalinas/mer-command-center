import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRef } from "react";
import { AlertTriangle, XCircle, Loader2 } from "lucide-react";
import {
  cn,
  BTN_OUTLINE,
  BTN_SOFT_PRIMARY,
  DIALOG_FOOTER,
  DIALOG_HEADER,
  DIALOG_SHELL,
  FOCUS_RING,
} from "@/lib/utils";
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
  DUPLICATE_ACTION: "Send Follow-Up?",
  ALREADY_ACTIVE: "Send Follow-Up?",
  CONTACT_NOT_FOUND: "Client Not Found",
  VALIDATION_ERROR: "Missing Information",
  NETWORK_ERROR: "Connection Error",
  UNKNOWN_ERROR: "Connection Error",
};

const OVERRIDE_LABELS: Record<string, string> = {
  DUPLICATE_ACTION: "Send Next Follow-Up",
  ALREADY_ACTIVE: "Send Next Follow-Up",
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
  const overrideLabel =
    (errorType && OVERRIDE_LABELS[errorType]) || "Send Anyway";
  const isWarning = allowOverride;
  const Icon = isWarning ? AlertTriangle : XCircle;
  const iconCls = isWarning ? "text-warning" : "text-destructive";
  const ringCls = isWarning
    ? "bg-warning/10 ring-warning/20"
    : "bg-destructive/10 ring-destructive/20";
  const canOverride = isWarning && allowOverride && overridePayload;
  const primaryRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent
        role="alertdialog"
        className={cn(DIALOG_SHELL, "sm:max-w-md")}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          primaryRef.current?.focus();
        }}
      >
        <DialogHeader className={cn(DIALOG_HEADER, "border-b-0 pb-4")}>
          <div className="flex items-start gap-3 pr-6">
            <div
              aria-hidden="true"
              className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ring-1 ${ringCls}`}
            >
              <Icon className={`h-5 w-5 ${iconCls}`} />
            </div>
            <div className="min-w-0 pt-1 space-y-1.5">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed break-words">
                {message}
              </DialogDescription>
              {canOverride && (
                <p className="text-[11px] text-muted-foreground">
                  Sending again will trigger the next step of the sequence for this client.
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className={cn(DIALOG_FOOTER, "flex-wrap")}>
          {canOverride ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={BTN_OUTLINE}
              >
                Cancel
              </button>
              <button
                type="button"
                ref={primaryRef}
                onClick={() =>
                  onConfirmOverride({ ...overridePayload, forceOverride: true })
                }
                disabled={isLoading}
                aria-busy={isLoading}
                className={cn("inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-md bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-colors duration-150 disabled:opacity-50", FOCUS_RING)}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {isLoading ? "Sending…" : overrideLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              ref={primaryRef}
              onClick={onClose}
              className={cn(BTN_SOFT_PRIMARY, "px-4")}
            >
              OK
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
