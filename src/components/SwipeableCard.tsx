import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { motion } from "framer-motion";

interface Action {
  label: string;
  icon: React.ElementType;
  onAction: () => void;
  /** Tailwind bg color class for the action panel */
  color?: string;
}

interface Props {
  children: ReactNode;
  /** Action revealed when user swipes left */
  leftAction?: Action;
  className?: string;
  /** Optional onClick when card is tapped (no swipe) */
  onTap?: () => void;
}

const REVEAL_PX = 88;
const TRIGGER_PX = 60;

/**
 * Swipe-left card with a single revealed action (#17).
 * Touch-only — pointer events on desktop fall through normally.
 */
export default function SwipeableCard({ children, leftAction, className, onTap }: Props) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // Lock to horizontal once user moves enough
    if (!isSwiping.current && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (isSwiping.current && leftAction) {
      // only allow left-swipe (negative dx)
      const next = Math.max(-REVEAL_PX, Math.min(0, dx));
      setOffset(next);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping.current) {
      if (Math.abs(offset) > TRIGGER_PX) {
        setOpen(true);
        setOffset(-REVEAL_PX);
      } else {
        setOpen(false);
        setOffset(0);
      }
    }
    startX.current = null;
    startY.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setOffset(0);
      return;
    }
    if (!isSwiping.current) onTap?.();
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? ""}`}>
      {leftAction && (
        <button
          onClick={() => {
            leftAction.onAction();
            setOpen(false);
            setOffset(0);
          }}
          className={`absolute inset-y-0 right-0 w-[88px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${leftAction.color ?? "bg-primary text-primary-foreground"}`}
          aria-label={leftAction.label}
        >
          <leftAction.icon className="h-4 w-4" />
          {leftAction.label}
        </button>
      )}
      <motion.div
        animate={{ x: offset }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="relative bg-card cursor-pointer touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
