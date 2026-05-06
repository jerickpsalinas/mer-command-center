import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionLabel: string;
  clientName: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  variant?: "destructive" | "warning" | "success" | "primary";
}

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
  success: "bg-success text-success-foreground hover:bg-success/90",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export default function ActionConfirmModal({
  open,
  onClose,
  onConfirm,
  actionLabel,
  clientName,
  description,
  confirmLabel,
  isLoading,
  variant = "primary",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-auto bg-card border border-border rounded-xl shadow-card p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            {actionLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1 space-y-3">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Client
            </p>
            <p className="text-sm font-semibold text-foreground break-words">
              {clientName}
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            {description}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variantClasses[variant]}`}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isLoading ? "Sending…" : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
