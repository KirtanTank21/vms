import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Visitor } from "../types";

export function useMyVisitors(hostId: string | null) {
  const [pending, setPending] = useState<Visitor[]>([]);
  const [approved, setApproved] = useState<Visitor[]>([]);
  const [newArrivals, setNewArrivals] = useState<Visitor[]>([]);
  const isFirst = useRef(true);

  useEffect(() => {
    if (!hostId) return;

    async function fetchAll() {
      const { data } = await supabase
        .from("visitors")
        .select("*")
        .eq("host_id", hostId)
        .in("status", ["pending", "approved"])
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false });

      const all = (data as Visitor[]) ?? [];
      setPending(all.filter((v) => v.status === "pending"));
      setApproved(all.filter((v) => v.status === "approved"));
    }

    fetchAll();

    const channel = supabase
      .channel(`my-visitors-${hostId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitors", filter: `host_id=eq.${hostId}` },
        (payload) => {
          const v = payload.new as Visitor;
          if (!isFirst.current) {
            setNewArrivals((prev) => [v, ...prev]);
          }
          setPending((prev) => [v, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "visitors", filter: `host_id=eq.${hostId}` },
        () => fetchAll()
      )
      .subscribe(() => {
        isFirst.current = false;
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostId]);

  function dismissArrival(id: string) {
    setNewArrivals((prev) => prev.filter((v) => v.id !== id));
  }

  return { pending, approved, newArrivals, dismissArrival };
}
