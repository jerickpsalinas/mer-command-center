import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { UserSettingsProvider } from "@/hooks/useUserSettings";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { MotionConfig } from "framer-motion";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MonthlyProgressPage = lazy(() => import("@/pages/MonthlyProgressPage"));
const MonthlyTrendsPage = lazy(() => import("@/pages/MonthlyTrendsPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const BookkeepersPage = lazy(() => import("@/pages/BookkeepersPage"));
const GhlActiveClientsPage = lazy(() => import("@/pages/GhlActiveClientsPage"));
const MasterCyclePage = lazy(() => import("@/pages/MasterCyclePage"));
const HealthPillarsPage = lazy(() => import("@/pages/HealthPillarsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const UserGuidePage = lazy(() => import("@/pages/UserGuidePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ActivityLogPage = lazy(() => import("@/pages/ActivityLogPage"));
const DeveloperPage = lazy(() => import("@/pages/DeveloperPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <UserSettingsProvider>
        <TooltipProvider>
        <MotionConfig reducedMotion="user">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense
                fallback={
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-xs font-medium tracking-wide">Loading…</p>
                  </div>
                }
              >
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/monthly-progress" element={<MonthlyProgressPage />} />
                  <Route path="/monthly-trends" element={<MonthlyTrendsPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/bookkeepers" element={<BookkeepersPage />} />
                  <Route path="/ghl-active-clients" element={<GhlActiveClientsPage />} />
                  <Route path="/master-cycle" element={<MasterCyclePage />} />
                  <Route path="/health-pillars" element={<HealthPillarsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/user-guide" element={<UserGuidePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/activity-log" element={<ActivityLogPage />} />
                  <Route path="/developer" element={<DeveloperPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </MotionConfig>
        </TooltipProvider>
      </UserSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
