import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Visitor, UserProfile } from "../types";

interface Props {
  profile: UserProfile | null;
}

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(inAt: string, outAt: string | null) {
  if (!outAt) return "Active";
  const mins = Math.round((new Date(outAt).getTime() - new Date(inAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function HistoryPage({ profile }: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchHistory();
  }, [profile, page, dateFrom, dateTo]);

  async function fetchHistory() {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from("visitors")
      .select("*", { count: "exact" })
      .eq("property_id", profile.property_id)
      .order("checked_in_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (dateFrom) query = query.gte("checked_in_at", dateFrom);
    if (dateTo) query = query.lte("checked_in_at", `${dateTo}T23:59:59`);

    const { data, count } = await query;
    setVisitors((data as Visitor[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  const filtered = search
    ? visitors.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          (v.host_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : visitors;

  if (!profile) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit History</h2>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Search visitor or host…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="input-field"
          />
          <span className="text-gray-400 text-sm shrink-0">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="input-field"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(0); }}
              className="btn-secondary shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 text-sm py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500 text-sm">No records found.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((v) => (
              <div key={v.id} className="card p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    {v.phone && <p className="text-xs text-gray-400">{v.phone}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.checked_out_at ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                    {duration(v.checked_in_at, v.checked_out_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="text-gray-400">Host:</span> {v.host_name}
                </p>
                {v.purpose && <p className="text-xs text-gray-400 mt-0.5">{v.purpose}</p>}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>In: {formatDateTime(v.checked_in_at)}</span>
                  {v.checked_out_at && <span>Out: {formatDateTime(v.checked_out_at)}</span>}
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
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Check In</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Check Out</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-600">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{v.host_name}</td>
                    <td className="py-3 px-4 text-gray-500">{v.purpose ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDateTime(v.checked_in_at)}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {v.checked_out_at ? formatDateTime(v.checked_out_at) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={v.checked_out_at ? "text-gray-500" : "text-green-600 font-medium"}>
                        {duration(v.checked_in_at, v.checked_out_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">
              Previous
            </button>
            <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
