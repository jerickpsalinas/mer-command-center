import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cn,
  BTN_OUTLINE,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_HEADER,
  DIALOG_SHELL,
  DIALOG_TITLE,
  FOCUS_RING,
  OVERLINE,
} from "@/lib/utils";

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
  /**
   * When true, the confirm button stays disabled until the user types the
   * exact `confirmPhrase` (defaults to the client name). Use for anything
   * that removes/erases user data. Overridable so callers can force-off.
   */
  requireTypeToConfirm?: boolean;
  confirmPhrase?: string;
}

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning",
  success: "bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
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
  requireTypeToConfirm,
  confirmPhrase,
}: Props) {
  // Default on for destructive actions unless explicitly opted out.
  const gated = requireTypeToConfirm ?? variant === "destructive";
  const phrase = (confirmPhrase ?? clientName).trim();
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const typedOk = !gated || typed.trim().toLowerCase() === phrase.toLowerCase();

  const title = actionLabel.trim().endsWith("?") ? actionLabel : `${actionLabel}?`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent
        className={cn(DIALOG_SHELL, "sm:max-w-md")}
        // Land focus on the confirm button (or the type-to-confirm input when gated).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (gated ? inputRef : confirmRef).current?.focus();
        }}
      >
        <DialogHeader className={DIALOG_HEADER}>
          <DialogTitle className={cn(DIALOG_TITLE, "text-sm font-semibold text-foreground")}>
            {variant === "destructive" && (
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Confirm this action for <span className="font-semibold text-foreground">{clientName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(DIALOG_BODY, "space-y-3")}>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className={OVERLINE}>
              Client
            </p>
            <p className="text-sm font-semibold text-foreground break-words">
              {clientName}
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            {description}
          </p>
          {gated && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <label htmlFor={inputId} className="block text-[11px] text-destructive font-semibold">
                Type <span className="font-mono-data bg-destructive/15 px-1.5 py-0.5 rounded">{phrase}</span> to confirm.
              </label>
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={phrase}
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={typed.length > 0 && !typedOk}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-destructive/60 focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:opacity-60"
              />
            </div>
          )}
        </div>

        <DialogFooter className={DIALOG_FOOTER}>
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
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading || !typedOk}
            aria-busy={isLoading}
            className={cn("inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed", FOCUS_RING, variantClasses[variant])}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {isLoading ? "Sending…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
