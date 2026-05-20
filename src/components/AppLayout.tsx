import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { NavLink } from "@/components/NavLink";
import { useSheetData } from "@/hooks/useSheetData";
import { useTheme } from "@/hooks/useTheme";
import NotificationDropdown from "@/components/NotificationDropdown";
import MobileTabBar from "@/components/MobileTabBar";
import MerFormModal from "@/components/MerFormModal";
import {
  LayoutDashboard, CalendarCheck, TrendingUp, Users, Download, Settings,
  Menu, X, ChevronLeft, RefreshCw, Sun, Moon, Workflow, UserCheck, HeartPulse, BookOpen, FilePlus2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Compliance Health", url: "/health-pillars", icon: HeartPulse },
  { title: "Master Bookkeeping Cycle", url: "/master-cycle", icon: Workflow },
  { title: "Monthly Progress", url: "/monthly-progress", icon: CalendarCheck },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Bookkeepers", url: "/bookkeepers", icon: UserCheck },
  { title: "Monthly Trends", url: "/monthly-trends", icon: TrendingUp },
  { title: "Export Center", url: "/reports", icon: Download },
  { title: "User Guide", url: "/user-guide", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
          transition={{ duration: 0.15 }}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addMerOpen, setAddMerOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const location = useLocation();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["sheet-data"] });
  const { data } = useSheetData();
  const currentTitle = navItems.find(n => n.url === location.pathname)?.title || "Dashboard";

  useEffect(() => {
    if (isFetching === 0) setLastSynced(new Date());
  }, [isFetching]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sheet-data"] });
  };

  const [timeSince, setTimeSince] = useState("just now");
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - lastSynced.getTime()) / 1000);
      if (secs < 10) setTimeSince("just now");
      else if (secs < 60) setTimeSince(`${secs}s ago`);
      else setTimeSince(`${Math.floor(secs / 60)}m ago`);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastSynced]);

  return (
    <div className="flex min-h-screen w-full bg-background vignette">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          sidebarOpen ? "w-[240px]" : "w-[60px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-[56px] items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="B&A Logo" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Brant & Associates
              </span>
            </div>
          )}
          {!sidebarOpen && (
            <img src={logo} alt="B&A" className="h-7 w-7 rounded-lg object-contain mx-auto" />
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

        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative ${
                  isActive
                    ? "bg-primary/10 text-primary"
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
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="sticky top-0 z-30 flex h-[56px] items-center gap-2 sm:gap-4 border-b border-border glass-panel px-3 sm:px-5 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-foreground truncate min-w-0">{currentTitle}</h1>

          <div className="flex-1" />

          <button
            onClick={() => setAddMerOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
            title="Add a new MER record"
          >
            <FilePlus2 className="h-4 w-4" />
            Add MER
          </button>
          <button
            onClick={() => setAddMerOpen(true)}
            className="sm:hidden h-9 w-9 flex items-center justify-center rounded-lg text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
            title="Add a new MER record"
          >
            <FilePlus2 className="h-[18px] w-[18px]" />
          </button>

          <ThemeToggleButton />

          <button
            onClick={handleRefresh}
            disabled={isFetching > 0}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-primary transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isFetching > 0 ? "animate-spin" : ""}`} />
          </button>

          <NotificationDropdown
            clients={data?.clients ?? []}
            trends={data?.monthlyTrends ?? []}
          />

          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
            <img src={logo} alt="BA" className="h-6 w-6 object-contain" />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden pb-[72px] lg:pb-8">
          <Outlet />
        </main>

        <footer className="hidden sm:block border-t border-border px-4 sm:px-8 py-3 glass-panel">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium leading-relaxed break-words">
            Last synced: <span className="text-foreground">{timeSince}</span> · Auto-refresh: 60s · <span className="hidden sm:inline">System Status: </span><span className="text-success">● Operational</span>
          </p>
        </footer>
      </div>

      {/* Mobile bottom tab bar (#16) */}
      <MobileTabBar onMore={() => setMobileOpen(true)} />

      {addMerOpen && (
        <MerFormModal
          open={addMerOpen}
          mode="add"
          clients={data?.merHistory ?? []}
          onClose={() => setAddMerOpen(false)}
        />
      )}
    </div>
  );
}
