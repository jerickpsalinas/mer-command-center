import { useState, useRef, useEffect } from "react";
import { Eye, Check, ChevronDown } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/useAuth";

const options: { value: AppRole | null; label: string }[] = [
  { value: null, label: "My Role (Developer)" },
  { value: "admin", label: "View as Admin" },
  { value: "bookkeeper", label: "View as Bookkeeper" },
];

export default function ViewAsRoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { actualRole, viewAsRole, setViewAsRole } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (actualRole !== "developer") return null;

  const currentLabel = viewAsRole
    ? `View as ${viewAsRole.charAt(0).toUpperCase() + viewAsRole.slice(1)}`
    : "My Role (Developer)";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`View dashboard as another role. Current: ${currentLabel}`}
        className={`inline-flex items-center gap-1.5 rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          viewAsRole
            ? "bg-primary/15 text-primary border-primary/40 hover:bg-primary/25"
            : "bg-accent/40 text-muted-foreground border-border hover:text-foreground hover:bg-accent"
        } ${compact ? "h-7 px-2 text-[10px]" : "h-8 px-2.5 text-[11px]"} font-semibold`}
        title="View dashboard as another role"
      >
        <Eye className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
        <span className="truncate max-w-[140px]">{currentLabel}</span>
        <ChevronDown
          className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} opacity-60 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="View as role"
          className="absolute right-0 mt-1.5 w-56 rounded-lg border border-border bg-popover text-popover-foreground shadow-elevated z-50 overflow-hidden"
        >
          {options.map((opt) => {
            const selected = (opt.value ?? null) === (viewAsRole ?? null);
            return (
              <button
                key={opt.label}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setViewAsRole(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-left transition-colors duration-150 focus-visible:outline-none focus-visible:bg-accent ${
                  selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
