import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { unregisterPush } from "../lib/push";
import type { UserProfile } from "../types";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: userData } = await supabase
      .from("users")
      .select("id, name, role, property_id")
      .eq("id", userId)
      .single();

    let propertyName = "";
    if (userData?.property_id) {
      const { data: propData } = await supabase
        .from("properties")
        .select("name")
        .eq("id", userData.property_id)
        .single();
      propertyName = propData?.name ?? "";
    }

    const built: UserProfile | null = userData
      ? {
          id: userData.id,
          name: userData.name,
          role: userData.role,
          property_id: userData.property_id ?? null,
          property_name: propertyName,
        }
      : null;

    setProfile(built);
    setLoading(false);

    // Push registration is triggered by the user clicking "Enable" in the dashboard
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  async function refreshProfile() {
    const { data } = await supabase.auth.getSession();
    if (data.session) await fetchProfile(data.session.user.id);
  }

  async function signOut() {
    if (profile?.role === "host") {
      unregisterPush(profile.id).catch(console.error);
    }
    await supabase.auth.signOut();
  }

  return { session, profile, loading, signOut, refreshProfile };
}
