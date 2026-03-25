import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  CalendarCheck,
  TrendingUp,
  Users,
  FileText,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Monthly Progress", url: "/monthly-progress", icon: CalendarCheck },
  { title: "Monthly Trends", url: "/monthly-trends", icon: TrendingUp },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentTitle = navItems.find(n => n.url === location.pathname)?.title || "Dashboard";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ${
          sidebarOpen ? "w-[240px]" : "w-[60px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-[56px] items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-[11px] font-bold text-primary-foreground">BA</span>
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Brant & Associates
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${!sidebarOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors relative ${
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                activeClassName=""
                onClick={() => setMobileOpen(false)}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border px-4 py-3">
          {sidebarOpen && (
            <p className="text-[11px] text-muted-foreground font-medium">
              MER Dashboard v1.0
            </p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-[56px] items-center gap-4 border-b border-border bg-card/80 backdrop-blur-xl px-5 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">{currentTitle}</h1>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground w-64 hover:border-muted-foreground/30 transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search clients…</span>
            <kbd className="ml-auto text-[10px] border border-border rounded px-1.5 py-0.5 font-mono-data">⌘K</kbd>
          </div>

          <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          </button>

          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold ring-2 ring-primary/10">
            BA
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-[1600px]">
          <Outlet />
        </main>

        <footer className="border-t border-border px-8 py-3">
          <p className="text-[11px] text-muted-foreground font-medium">Last synced: 2 mins ago · System Status: <span className="text-success">Operational</span></p>
        </footer>
      </div>
    </div>
  );
}
