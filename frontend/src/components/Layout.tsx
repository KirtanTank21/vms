import { NavLink, Outlet } from "react-router-dom";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile | null;
  onSignOut: () => void;
}

export function Layout({ profile, onSignOut }: Props) {
  const isGuardOrAdmin = profile?.role === "guard" || profile?.role === "admin";
  const isHostOrAdmin = profile?.role === "host" || profile?.role === "admin";

  const navLinks = [
    ...(isGuardOrAdmin ? [
      { to: "/active", label: "Active" },
      { to: "/history", label: "History" },
    ] : []),
    ...(isHostOrAdmin ? [{ to: "/my-visitors", label: "My Visitors" }] : []),
    ...(profile?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
        <span className="font-bold text-blue-600 text-lg">VMS</span>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{profile?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role} · {profile?.property_name}</p>
          </div>
          <button onClick={onSignOut} className="text-xs text-gray-400 hover:text-red-600 border border-gray-200 rounded px-2 py-1">
            Out
          </button>
        </div>
      </header>

      {/* Desktop top nav */}
      <nav className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-600 text-lg">VMS</span>
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? "text-blue-600 font-medium text-sm" : "text-gray-600 text-sm hover:text-gray-900"
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{profile?.name}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs capitalize">{profile?.role}</span>
          <button onClick={onSignOut} className="text-gray-500 hover:text-red-600">Sign out</button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 pb-24 md:py-6 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50 safe-area-inset-bottom">
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium transition-colors ${
                isActive ? "text-blue-600 border-t-2 border-blue-600 -mt-px" : "text-gray-400"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
