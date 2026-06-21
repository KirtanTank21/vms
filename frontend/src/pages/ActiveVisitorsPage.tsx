import { useState } from "react";
import { useActiveVisitors } from "../hooks/useActiveVisitors";
import { VisitorRow } from "../components/VisitorRow";
import { checkOut } from "../lib/api";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ActiveVisitorsPage({ profile }: Props) {
  const { visitors, loading, removeVisitor } = useActiveVisitors(profile?.property_id ?? null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  async function handleCheckout(id: string) {
    setCheckingOut(id);
    try {
      await checkOut(id);
      removeVisitor(id);
    } finally {
      setCheckingOut(null);
    }
  }

  if (!profile) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Visitors</h2>
        <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
          {visitors.length} inside
        </span>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 text-sm py-12">Loading…</p>
      ) : visitors.length === 0 ? (
        <div className="card p-8 text-center text-gray-500 text-sm">
          No visitors currently on premises.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {visitors.map((v) => (
              <div key={v.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  {v.photo_url ? (
                    <img src={v.photo_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg shrink-0">
                      {v.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    {v.phone && <p className="text-xs text-gray-500">{v.phone}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{formatTime(v.checked_in_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Host: </span>
                    <span className="text-gray-800 font-medium">{v.host_name}</span>
                    {v.purpose && <p className="text-xs text-gray-400 mt-0.5">{v.purpose}</p>}
                  </div>
                  <button
                    onClick={() => handleCheckout(v.id)}
                    disabled={checkingOut === v.id}
                    className="btn-danger shrink-0 ml-3"
                  >
                    {checkingOut === v.id ? "..." : "Check out"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Visitor</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Host</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Purpose</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Checked In</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <VisitorRow key={v.id} visitor={v} onCheckedOut={() => removeVisitor(v.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
