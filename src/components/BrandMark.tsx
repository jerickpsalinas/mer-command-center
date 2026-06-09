import logo from "@/assets/official-logo.png";

interface BrandMarkProps {
  className?: string;
  label?: string;
}

/**
 * Brand logo mark used across the app.
 */
export default function BrandMark({ className = "h-7 w-7" }: BrandMarkProps) {
  return (
    <img
      src={logo}
      alt="JPS"
      className={`${className} object-contain`}
    />
  );
}
