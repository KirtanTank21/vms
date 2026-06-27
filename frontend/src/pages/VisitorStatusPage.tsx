import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { subscribeVisitorPush } from "../lib/push";
import type { Visitor } from "../types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function playStatusSound(approved: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    if (approved) {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(294, ctx.currentTime + 0.25);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch {}
}

function vibrate(pattern: number[]) {
  try { navigator.vibrate?.(pattern); } catch {}
}

export function VisitorStatusPage() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"idle" | "enabling" | "granted" | "denied" | "unsupported">("idle");
  const prevStatus = useRef<string | null>(null);

  function applyUpdate(v: Visitor) {
    setVisitor((current) => {
      const old = current?.status ?? prevStatus.current;
      if (old === "pending" && v.status !== "pending") {
        const approved = v.status === "approved";
        playStatusSound(approved);
        vibrate(approved ? [100, 50, 100, 50, 400] : [300, 100, 300]);
      }
      prevStatus.current = v.status;
      return v;
    });
  }

  useEffect(() => {
    if (!visitorId) return;

    // Initial fetch
    supabase
      .from("visitors")
      .select("*")
      .eq("id", visitorId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Visitor record not found.");
        } else {
          prevStatus.current = (data as Visitor).status;
          setVisitor(data as Visitor);
        }
      });

    // Supabase realtime
    const channel = supabase
      .channel(`visitor-status-${visitorId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "visitors", filter: `id=eq.${visitorId}` },
        (payload) => applyUpdate(payload.new as Visitor)
      )
      .subscribe();

    // Polling fallback every 8s — catches realtime failures
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("visitors")
        .select("*")
        .eq("id", visitorId)
        .single();
      if (data) applyUpdate(data as Visitor);
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [visitorId]);

  // Check if push already granted
  useEffect(() => {
    if (!("Notification" in window)) { setPushState("unsupported"); return; }
    if (Notification.permission === "granted") setPushState("granted");
    if (Notification.permission === "denied") setPushState("denied");
  }, []);

  async function enablePush() {
    if (!visitorId) return;
    setPushState("enabling");
    const result = await subscribeVisitorPush(visitorId);
    setPushState(result);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const isPending  = visitor.status === "pending";
  const isApproved = visitor.status === "approved";
  const isRejected = visitor.status === "rejected";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">VMS</h1>
        </div>

        {/* Push notification banner — only while pending */}
        {isPending && pushState === "idle" && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <span className="text-amber-900">Get notified when approved</span>
            <button
              onClick={enablePush}
              className="ml-3 shrink-0 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600"
            >
              Enable
            </button>
          </div>
        )}
        {isPending && pushState === "enabling" && (
          <div className="text-center text-xs text-gray-400 mb-4">Enabling notifications…</div>
        )}
        {isPending && pushState === "denied" && (
          <div className="text-center text-xs text-red-400 mb-4">Notifications blocked. Enable in browser settings.</div>
        )}

        <div className={`rounded-2xl border-2 p-6 text-center shadow-sm transition-all ${
          isPending  ? "bg-white border-gray-200"
          : isApproved ? "bg-green-50 border-green-400"
          : "bg-red-50 border-red-400"
        }`}>
          {/* Status icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPending  ? "bg-blue-100"
            : isApproved ? "bg-green-100"
            : "bg-red-100"
          }`}>
            {isPending  && <span className="text-4xl animate-pulse">⏳</span>}
            {isApproved && <span className="text-4xl">✓</span>}
            {isRejected && <span className="text-4xl">✕</span>}
          </div>

          <p className={`text-2xl font-bold mb-1 ${
            isPending  ? "text-gray-700"
            : isApproved ? "text-green-700"
            : "text-red-700"
          }`}>
            {isPending  && "Awaiting Approval"}
            {isApproved && "APPROVED"}
            {isRejected && "NOT APPROVED"}
          </p>

          {isPending  && <p className="text-sm text-gray-500 mb-4">Your request has been sent. Please wait.</p>}
          {isApproved && <p className="text-sm text-green-600 mb-4">Show this screen to the guard to enter.</p>}
          {isRejected && <p className="text-sm text-red-500 mb-4">Entry has been denied by the resident.</p>}

          <div className={`rounded-xl p-4 text-left text-sm space-y-2 mt-2 ${
            isPending  ? "bg-gray-50"
            : isApproved ? "bg-green-100/50"
            : "bg-red-100/50"
          }`}>
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-semibold text-gray-900">{visitor.name}</span>
            </div>
            {visitor.host_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Host</span>
                <span className="font-medium text-gray-800">{visitor.host_name}</span>
              </div>
            )}
            {visitor.unit_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Flat</span>
                <span className="font-medium text-gray-800">{visitor.unit_number}</span>
              </div>
            )}
            {visitor.purpose && (
              <div className="flex justify-between">
                <span className="text-gray-500">Purpose</span>
                <span className="text-gray-700">{visitor.purpose}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Requested at</span>
              <span className="text-gray-700">{formatTime(visitor.checked_in_at)}</span>
            </div>
            {visitor.badge_number && isApproved && (
              <div className="flex justify-between">
                <span className="text-gray-500">Pass</span>
                <span className="font-mono text-xs text-gray-500">{visitor.badge_number}</span>
              </div>
            )}
          </div>
        </div>

        {isPending && (
          <p className="text-center text-xs text-gray-400 mt-4">
            This page updates automatically. Keep it open.
          </p>
        )}
      </div>
    </div>
  );
}
