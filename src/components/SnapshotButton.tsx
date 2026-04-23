import { useCallback, useState, type RefObject } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";

interface SnapshotButtonProps {
  /** Ref to the DOM node that should be captured. */
  targetRef: RefObject<HTMLElement>;
  /** Filename slug — final file becomes `MER_<slug>_<YYYY-MM-DD>.png`. */
  fileSlug: string;
  /** Optional context line shown in the PNG footer (e.g. "May 2025 · live"). */
  contextLabel?: string;
  /** Short helper text under the icon. Default: "Save section as PNG". */
  helper?: string;
  /** Compact = no helper text, just icon (good for dense toolbars). */
  compact?: boolean;
  /** Optional extra class names for positioning. */
  className?: string;
}

/**
 * Tile-style snapshot button. Captures the referenced node as PNG,
 * temporarily expanding scrollable / clipped content so nothing is cut off.
 * A footer stamp is appended (app · context · captured date).
 */
export default function SnapshotButton({
  targetRef,
  fileSlug,
  contextLabel,
  helper = "Save section as PNG",
  compact = false,
  className = "",
}: SnapshotButtonProps) {
  const [state, setState] = useState<"idle" | "capturing" | "done">("idle");

  const handleCapture = useCallback(async () => {
    const node = targetRef.current;
    if (!node || state === "capturing") return;
    setState("capturing");

    // Snapshot of styles we'll touch so we can restore everything afterwards
    const restorers: Array<() => void> = [];

    const expandScrollables = (root: HTMLElement) => {
      const candidates: HTMLElement[] = [
        root,
        ...Array.from(root.querySelectorAll<HTMLElement>("*")),
      ];
      for (const el of candidates) {
        const cs = window.getComputedStyle(el);
        const overflowY = cs.overflowY;
        const overflowX = cs.overflowX;
        const maxH = cs.maxHeight;
        const inlineH = el.style.height; // framer-motion / animations set this
        const heightZero = inlineH === "0px" || cs.height === "0px";
        const needsExpand =
          overflowY === "auto" || overflowY === "scroll" ||
          overflowX === "auto" || overflowX === "scroll" ||
          (maxH && maxH !== "none") ||
          heightZero;
        if (!needsExpand) continue;

        const prev = {
          maxHeight: el.style.maxHeight,
          maxWidth: el.style.maxWidth,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
          height: el.style.height,
          opacity: el.style.opacity,
        };
        el.style.maxHeight = "none";
        el.style.maxWidth = "none";
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.overflowY = "visible";
        if (heightZero) {
          el.style.height = "auto";
          el.style.opacity = "1";
        } else if (el.scrollHeight > el.clientHeight) {
          el.style.height = `${el.scrollHeight}px`;
        }

        restorers.push(() => {
          el.style.maxHeight = prev.maxHeight;
          el.style.maxWidth = prev.maxWidth;
          el.style.overflow = prev.overflow;
          el.style.overflowX = prev.overflowX;
          el.style.overflowY = prev.overflowY;
          el.style.height = prev.height;
          el.style.opacity = prev.opacity;
        });
      }
    };

    try {
      expandScrollables(node);

      // Let the browser paint expanded layout + finish chart animations
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise((r) => setTimeout(r, 350));

      // Resolve background color from the page so PNGs aren't transparent
      const bg = window.getComputedStyle(document.body).backgroundColor || "#1a1614";

      const canvas = await html2canvas(node, {
        backgroundColor: bg,
        scale: window.devicePixelRatio >= 2 ? 2 : 1.75,
        useCORS: true,
        logging: false,
        windowWidth: Math.max(node.scrollWidth, node.clientWidth, 1280),
        windowHeight: Math.max(node.scrollHeight, node.clientHeight),
      });

      // Compose: original capture + footer stamp
      const footerH = 44;
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height + footerH * (canvas.width / node.clientWidth);
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("canvas-ctx");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);

      // Footer
      const scale = canvas.width / node.clientWidth;
      const padX = 16 * scale;
      const baseY = canvas.height + 26 * scale;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `${12 * scale}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      const left = `Brant & Associates · MER Dashboard${contextLabel ? ` · ${contextLabel}` : ""}`;
      ctx.fillText(left, padX, baseY);
      const right = `Captured ${date}`;
      const rightW = ctx.measureText(right).width;
      ctx.fillText(right, out.width - rightW - padX, baseY);

      const isoDate = new Date().toISOString().split("T")[0];
      const url = out.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `MER_${fileSlug}_${isoDate}.png`;
      link.href = url;
      link.click();

      setState("done");
      toast({ title: "PNG saved", description: `${fileSlug.replace(/_/g, " ")} · ${isoDate}` });
      setTimeout(() => setState("idle"), 1600);
    } catch (err) {
      setState("idle");
      toast({ title: "Capture failed", description: "Could not generate PNG.", variant: "destructive" });
    } finally {
      // Always restore
      restorers.forEach((fn) => {
        try { fn(); } catch {}
      });
    }
  }, [targetRef, fileSlug, contextLabel, state]);

  const Icon =
    state === "capturing" ? Loader2 : state === "done" ? Check : Camera;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCapture}
        disabled={state === "capturing"}
        title={helper}
        aria-label={helper}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 ${className}`}
      >
        <Icon className={`h-3.5 w-3.5 ${state === "capturing" ? "animate-spin" : ""}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCapture}
      disabled={state === "capturing"}
      className={`group inline-flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left shadow-card hover:border-primary/40 hover:bg-accent/30 transition-colors disabled:opacity-60 ${className}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
          state === "done"
            ? "bg-success/15 text-success"
            : "bg-primary/10 text-primary group-hover:bg-primary/20"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${state === "capturing" ? "animate-spin" : ""}`} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold text-foreground">
          {state === "capturing" ? "Capturing…" : state === "done" ? "Saved" : "Snapshot"}
        </span>
        <span className="text-[10px] text-muted-foreground">{helper}</span>
      </span>
    </button>
  );
}
