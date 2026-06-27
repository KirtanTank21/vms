import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Visitor } from "../types";

export function useActiveVisitors(propertyId: string | null) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    async function fetch() {
      const { data } = await supabase
        .from("visitors")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "approved")
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false });
      setVisitors((data as Visitor[]) ?? []);
      setLoading(false);
    }

    fetch();

    const channel = supabase
      .channel("active-visitors")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
          filter: `property_id=eq.${propertyId}`,
        },
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  function removeVisitor(id: string) {
    setVisitors((prev) => prev.filter((v) => v.id !== id));
  }

  return { visitors, loading, removeVisitor };
}
