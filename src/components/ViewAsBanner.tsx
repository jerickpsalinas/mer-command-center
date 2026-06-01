import { Eye, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ViewAsBanner() {
  const { actualRole, viewAsRole, setViewAsRole } = useAuth();
  if (actualRole !== "developer" || !viewAsRole) return null;
  const label = viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1);
  return (
    <button
      onClick={() => setViewAsRole(null)}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold bg-primary/15 text-primary border-b border-primary/30 hover:bg-primary/25 transition-colors group"
      title="Click to switch back to Developer"
    >
      <Eye className="h-3.5 w-3.5" />
      <span>Viewing as {label} — Switch back to Developer</span>
      <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
    </button>
  );
}
