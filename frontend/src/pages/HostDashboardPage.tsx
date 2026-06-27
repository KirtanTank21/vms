import { useState, useEffect } from "react";
import { useMyVisitors } from "../hooks/useMyVisitors";
import { approveVisitor, rejectVisitor } from "../lib/api";
import { registerPush } from "../lib/push";
import type { UserProfile, Visitor } from "../types";

interface Props {
  profile: UserProfile | null;
}

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function Avatar({ name, photo_url }: { name: string; photo_url?: string | null }) {
  if (photo_url) return <img src={photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg shrink-0">
      {name[0].toUpperCase()}
    </div>
  );
}

function RequestCard({ visitor, onApprove, onReject, actioning }: {
  visitor: Visitor;
  onApprove: () => void;
  onReject: () => void;
  actioning: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={visitor.name} photo_url={visitor.photo_url} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{visitor.name}</p>
          {visitor.phone && <p className="text-xs text-gray-500">{visitor.phone}</p>}
          {visitor.unit_number && <p className="text-xs text-gray-400">Flat {visitor.unit_number}</p>}
          {visitor.purpose && <p className="text-xs text-gray-400 italic">{visitor.purpose}</p>}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{elapsed(visitor.checked_in_at)}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={actioning}
          className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {actioning ? "…" : "Approve"}
        </button>
        <button
          onClick={onReject}
          disabled={actioning}
          className="flex-1 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function VisitorCard({ visitor }: { visitor: Visitor }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <Avatar name={visitor.name} photo_url={visitor.photo_url} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{visitor.name}</p>
        {visitor.phone && <p className="text-xs text-gray-500">{visitor.phone}</p>}
        {visitor.unit_number && <p className="text-xs text-gray-400">Flat {visitor.unit_number}</p>}
        {visitor.purpose && <p className="text-xs text-gray-400 italic">{visitor.purpose}</p>}
      </div>
      <div className="text-right shrink-0">
        <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Inside</span>
        <p className="text-xs text-gray-400 mt-1">{elapsed(visitor.checked_in_at)}</p>
      </div>
    </div>
  );
}

type Tab = "requests" | "visitors";

function NotificationBanner({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "enabling" | "done" | "denied">("idle");

  useEffect(() => {
    if (Notification.permission === "granted") setState("done");
    if (Notification.permission === "denied") setState("denied");
  }, []);

  if (state === "done" || state === "denied") return null;

  async function enable() {
    setState("enabling");
    try {
      await registerPush(userId);
      setState(Notification.permission === "granted" ? "done" : "denied");
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
      <div className="flex items-center gap-2">
        <span>🔔</span>
        <span className="text-amber-900">Enable notifications to get instant visitor alerts</span>
      </div>
      <button
        onClick={enable}
        disabled={state === "enabling"}
        className="ml-3 shrink-0 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-60"
      >
        {state === "enabling" ? "…" : "Enable"}
      </button>
    </div>
  );
}

export function HostDashboardPage({ profile }: Props) {
  const { pending, approved, newArrivals, dismissArrival } = useMyVisitors(profile?.id ?? null);
  const [tab, setTab] = useState<Tab>("requests");
  const [actioning, setActioning] = useState<string | null>(null);

  // Auto-switch to Requests tab when a new visitor arrives
  useEffect(() => {
    if (newArrivals.length > 0) setTab("requests");
  }, [newArrivals.length]);

  if (!profile) return null;

  async function handleApprove(visitor: Visitor) {
    setActioning(visitor.id);
    try {
      await approveVisitor(visitor.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(visitor: Visitor) {
    setActioning(visitor.id);
    try {
      await rejectVisitor(visitor.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <NotificationBanner userId={profile.id} />

      {/* New arrival toast — shows above tabs */}
      {newArrivals.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 animate-pulse-once"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">{v.name} is requesting entry</p>
              {v.unit_number && <p className="text-xs text-blue-600">Flat {v.unit_number}</p>}
            </div>
          </div>
          <button onClick={() => dismissArrival(v.id)} className="text-blue-400 hover:text-blue-600 text-xs ml-3 shrink-0">
            Dismiss
          </button>
        </div>
      ))}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab("requests")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            tab === "requests" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Requests
          {pending.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("visitors")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            tab === "visitors" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Visitors
          {approved.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white text-xs rounded-full font-bold">
              {approved.length}
            </span>
          )}
        </button>
      </div>

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">
              No pending requests right now.
            </div>
          ) : (
            pending.map((v) => (
              <RequestCard
                key={v.id}
                visitor={v}
                onApprove={() => handleApprove(v)}
                onReject={() => handleReject(v)}
                actioning={actioning === v.id}
              />
            ))
          )}
        </div>
      )}

      {/* My Visitors tab */}
      {tab === "visitors" && (
        <div className="flex flex-col gap-3">
          {approved.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">
              No visitors currently inside.
            </div>
          ) : (
            approved.map((v) => (
              <VisitorCard key={v.id} visitor={v} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
