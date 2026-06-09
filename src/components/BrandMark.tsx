interface BrandMarkProps {
  className?: string;
  label?: string;
}

/**
 * Lightweight monogram logo used across the app.
 * Replaces the prior raster logo asset with a token-aware mark.
 */
export default function BrandMark({ className = "h-7 w-7", label = "GB" }: BrandMarkProps) {
  return (
    <div
      className={`${className} rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-display font-semibold tracking-tight shadow-card`}
      aria-label="Greenfield Bookkeeping"
    >
      <span className="text-[0.65em] leading-none">{label}</span>
    </div>
  );
}
