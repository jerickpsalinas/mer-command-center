import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Workflow, Users, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  /** Open the full sidebar drawer */
  onMore: () => void;
}

/**
 * Mobile bottom tab bar.
 * 4 destinations: Dashboard, Master Cycle, Clients, More (opens sidebar).
 */
export default function MobileTabBar({ onMore }: Props) {
  const { pathname } = useLocation();

  const tabs: { to?: string; label: string; icon: typeof LayoutDashboard; onClick?: () => void }[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/master-cycle", label: "Cycle", icon: Workflow },
    { to: "/clients", label: "Clients", icon: Users },
    { label: "More", icon: MoreHorizontal, onClick: onMore },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-panel border-t border-border"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
      aria-label="Primary mobile navigation"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = t.to ? (t.to === "/" ? pathname === "/" : pathname.startsWith(t.to)) : false;
          const inner = (
            <div className="relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium">
              {active && (
                <motion.span
                  layoutId="tab-bar-active"
                  className="absolute top-0 inset-x-6 h-[2px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <t.icon
                className={`h-[18px] w-[18px] transition-transform ${active ? "text-primary scale-105" : "text-muted-foreground"}`}
              />
              <span className={active ? "text-primary" : "text-muted-foreground"}>{t.label}</span>
            </div>
          );
          return (
            <li key={t.label}>
              {t.to ? (
                <NavLink to={t.to} end={t.to === "/"} className="block">
                  {inner}
                </NavLink>
              ) : (
                <button onClick={t.onClick} className="w-full text-left">
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
