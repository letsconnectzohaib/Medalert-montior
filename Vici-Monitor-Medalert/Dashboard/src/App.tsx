
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AgentPerformance from "./pages/AgentPerformance";
import LiveFeed from "./pages/LiveFeed";
import QueueMonitor from "./pages/QueueMonitor";
import SLADashboard from "./pages/SLADashboard";
import CallAnalytics from "./pages/CallAnalytics";
import Trends from "./pages/Trends";
import ShiftReports from "./pages/ShiftReports";
import CapacityPlanning from "./pages/CapacityPlanning";
import ShiftTimeline from "./pages/ShiftTimeline";
import ConnectionPage from "./pages/ConnectionPage";
import SettingsPage from "./pages/SettingsPage";
import ShiftSummary from "./pages/ShiftSummary";
import { DashboardLayout } from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import EnhancedErrorBoundary from "@/components/EnhancedErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <EnhancedErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agents" element={<AgentPerformance />} />
                <Route path="/live" element={<LiveFeed />} />
                <Route path="/queue" element={<QueueMonitor />} />
                <Route path="/sla" element={<SLADashboard />} />
                <Route path="/analytics" element={<CallAnalytics />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/reports" element={<ShiftReports />} />
                <Route path="/capacity" element={<CapacityPlanning />} />
                <Route path="/timeline" element={<ShiftTimeline />} />
                <Route path="/connection" element={<ConnectionPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/shift-summary" element={<ShiftSummary />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </EnhancedErrorBoundary>
);

export default App;
