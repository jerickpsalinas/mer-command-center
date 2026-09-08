import { Eye, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ViewAsBanner() {
  const { actualRole, viewAsRole, setViewAsRole } = useAuth();
  if (actualRole !== "developer" || !viewAsRole) return null;
  const label = viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1);
  return (
    <button
      type="button"
      onClick={() => setViewAsRole(null)}
      className="w-full min-h-[40px] flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold bg-primary/15 text-primary border-b border-primary/30 hover:bg-primary/25 transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-inset focus-visible:ring-offset-0"
      title="Click to switch back to Developer"
      aria-label={`Viewing as ${label}. Switch back to Developer`}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Viewing as {label} — Switch back to Developer</span>
      <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true" />
    </button>
  );
}
