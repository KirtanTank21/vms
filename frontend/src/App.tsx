import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { CheckInPage } from "./pages/CheckInPage";
import { ActiveVisitorsPage } from "./pages/ActiveVisitorsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BadgePrintPage } from "./pages/BadgePrintPage";
import { HostDashboardPage } from "./pages/HostDashboardPage";
import { AdminPage } from "./pages/AdminPage";

function defaultRoute(role?: string) {
  if (role === "host") return "/my-visitors";
  if (role === "admin") return "/admin";
  return "/checkin";
}

export default function App() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to={defaultRoute(profile?.role)} replace /> : <LoginPage />} />
        <Route path="/badge/:id" element={<BadgePrintPage />} />
        <Route element={<ProtectedRoute session={session} />}>
          <Route element={<Layout profile={profile} onSignOut={signOut} />}>
            <Route path="/" element={<Navigate to={defaultRoute(profile?.role)} replace />} />
            <Route path="/checkin"     element={<CheckInPage profile={profile} />} />
            <Route path="/active"      element={<ActiveVisitorsPage profile={profile} />} />
            <Route path="/history"     element={<HistoryPage profile={profile} />} />
            <Route path="/my-visitors" element={<HostDashboardPage profile={profile} />} />
            <Route path="/admin"       element={<AdminPage profile={profile} />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
