import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { VisitPage } from "./pages/VisitPage";
import { VisitorStatusPage } from "./pages/VisitorStatusPage";
import { ActiveVisitorsPage } from "./pages/ActiveVisitorsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BadgePrintPage } from "./pages/BadgePrintPage";
import { HostDashboardPage } from "./pages/HostDashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { LoginPage } from "./pages/LoginPage";

function defaultRoute(role?: string) {
  if (role === "host") return "/my-visitors";
  if (role === "admin") return "/admin";
  return "/active";
}

export default function App() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  // Logged in but profile missing — account exists in auth but not in users table
  if (session && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-semibold text-gray-900 mb-1">Profile not found</p>
          <p className="text-sm text-gray-500 mb-2">
            Your login worked, but no profile record was found in the system.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Auth ID: <span className="font-mono">{session.user.id}</span>
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Ask your admin to make sure a user record exists with this exact ID in the users table.
          </p>
          <button onClick={signOut} className="btn-secondary w-full">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/login" element={session ? <Navigate to={defaultRoute(profile?.role)} replace /> : <LoginPage />} />
        <Route path="/visit/:propertyId" element={<VisitPage />} />
        <Route path="/visitor/:visitorId" element={<VisitorStatusPage />} />
        <Route path="/badge/:id" element={<BadgePrintPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute session={session} />}>
          <Route element={<Layout profile={profile} onSignOut={signOut} />}>
            <Route path="/" element={<Navigate to={defaultRoute(profile?.role)} replace />} />
            <Route path="/active"      element={<ActiveVisitorsPage profile={profile} />} />
            <Route path="/history"     element={<HistoryPage profile={profile} />} />
            <Route path="/my-visitors" element={<HostDashboardPage profile={profile} />} />
            <Route path="/admin"       element={<AdminPage profile={profile} onPropertyCreated={refreshProfile} />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
