import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { registerPush, unregisterPush } from "../lib/push";
import type { UserProfile } from "../types";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[auth] initialising — calling getSession");
    supabase.auth.getSession().then(({ data }) => {
      console.log("[auth] getSession result:", data.session ? `session for ${data.session.user.email}` : "no session");
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[auth] onAuthStateChange event:", _event, session ? `user: ${session.user.email}` : "no session");
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    console.log("[auth] fetchProfile called for userId:", userId);
    const { data, error } = await supabase
      .from("users")
      .select("id, name, role, property_id, properties(name)")
      .eq("id", userId)
      .single();
    console.log("[auth] fetchProfile result — data:", data, "error:", error);
    const raw = data as any;
    const profile: UserProfile | null = raw
      ? {
          id: raw.id,
          name: raw.name,
          role: raw.role,
          property_id: raw.property_id,
          property_name: raw.properties?.name ?? "",
        }
      : null;
    console.log("[auth] profile built:", profile);
    setProfile(profile);
    setLoading(false);

    if (profile?.role === "host") {
      registerPush(profile.id).catch(console.error);
    }
  }

  async function signOut() {
    if (profile?.role === "host") {
      unregisterPush(profile.id).catch(console.error);
    }
    await supabase.auth.signOut();
  }

  return { session, profile, loading, signOut };
}
