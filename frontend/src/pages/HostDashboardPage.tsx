import { useMyVisitors } from "../hooks/useMyVisitors";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile | null;
}

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function HostDashboardPage({ profile }: Props) {
  const { active, newArrivals, dismissArrival } = useMyVisitors(profile?.id ?? null);

  if (!profile) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">My Visitors</h2>

      {/* New arrival alerts */}
      {newArrivals.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">{v.name} has arrived</p>
              {v.purpose && <p className="text-sm text-blue-600">{v.purpose}</p>}
            </div>
          </div>
          <button onClick={() => dismissArrival(v.id)} className="text-blue-400 hover:text-blue-600 text-sm ml-3 shrink-0">
            Dismiss
          </button>
        </div>
      ))}

      {active.length === 0 ? (
        <div className="card p-8 text-center text-gray-500 text-sm">
          No visitors currently waiting.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {active.map((v) => (
              <div key={v.id} className="card p-4">
                <div className="flex items-center gap-3">
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
                    {v.purpose && <p className="text-xs text-gray-400 mt-0.5">{v.purpose}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{elapsed(v.checked_in_at)}</p>
                    <p className="text-xs font-mono text-gray-300 mt-1">#{v.badge_number}</p>
                  </div>
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
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Purpose</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Arrived</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Badge</th>
                </tr>
              </thead>
              <tbody>
                {active.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {v.photo_url ? (
                          <img src={v.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                            {v.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{v.name}</p>
                          {v.phone && <p className="text-xs text-gray-500">{v.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{v.purpose ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{elapsed(v.checked_in_at)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-400">{v.badge_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
