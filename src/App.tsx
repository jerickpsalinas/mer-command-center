import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { UserSettingsProvider } from "@/hooks/useUserSettings";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import MonthlyProgressPage from "@/pages/MonthlyProgressPage";
import MonthlyTrendsPage from "@/pages/MonthlyTrendsPage";
import ClientsPage from "@/pages/ClientsPage";
import BookkeepersPage from "@/pages/BookkeepersPage";
import GhlActiveClientsPage from "@/pages/GhlActiveClientsPage";
import MasterCyclePage from "@/pages/MasterCyclePage";
import HealthPillarsPage from "@/pages/HealthPillarsPage";
import ReportsPage from "@/pages/ReportsPage";
import UserGuidePage from "@/pages/UserGuidePage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <UserSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/monthly-progress" element={<MonthlyProgressPage />} />
                <Route path="/monthly-trends" element={<MonthlyTrendsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/bookkeepers" element={<BookkeepersPage />} />
                <Route path="/master-cycle" element={<MasterCyclePage />} />
                <Route path="/health-pillars" element={<HealthPillarsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/user-guide" element={<UserGuidePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
