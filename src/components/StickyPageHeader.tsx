import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Anything to render inside the sticky bar (chips, count, actions) */
  children: ReactNode;
  /** Sentinel element to watch — when it scrolls above viewport, the bar appears */
  className?: string;
  /** Top offset in px to account for the app header (default 56px) */
  topOffset?: number;
}

/**
 * Sticky page sub-header (#3).
 *
 * Renders an invisible sentinel at the top, then a sticky bar that fades in
 * once the user has scrolled past the sentinel. Pages pass their current
 * filter chips / result count as `children`.
 */
export default function StickyPageHeader({ children, className, topOffset = 56 }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => setStuck(!entries[0].isIntersecting),
      { rootMargin: `-${topOffset + 4}px 0px 0px 0px`, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [topOffset]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <AnimatePresence>
        {stuck && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ top: topOffset }}
            className={`sticky z-20 -mx-3 sm:-mx-5 lg:-mx-8 px-3 sm:px-5 lg:px-8 py-2 border-b border-border glass-panel ${className ?? ""}`}
          >
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
