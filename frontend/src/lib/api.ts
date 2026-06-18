import { supabase } from "./supabase";
import type { Visitor, BadgeData } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

function generateBadgeNumber(): string {
  return "VMS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function checkIn(payload: {
  name: string;
  phone?: string;
  photo_url?: string;
  host_id: string;
  host_name: string;
  purpose?: string;
  property_id: string;
  logged_by: string;
}): Promise<Visitor> {
  const { data, error } = await supabase
    .from("visitors")
    .insert({ ...payload, badge_number: generateBadgeNumber() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const visitor = data as Visitor;

  if (visitor.host_id) {
    fetch(`${API_URL}/notify/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: visitor.id,
        visitor_name: visitor.name,
        host_id: visitor.host_id,
      }),
    }).catch(console.error);
  }

  return visitor;
}

export async function checkOut(visitorId: string): Promise<void> {
  const { error } = await supabase
    .from("visitors")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", visitorId);

  if (error) throw new Error(error.message);
}

export async function getBadgeData(visitorId: string): Promise<BadgeData> {
  const { data, error } = await supabase
    .from("visitors")
    .select("*, properties(name)")
    .eq("id", visitorId)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    name: data.name,
    host_name: data.host_name,
    purpose: data.purpose,
    badge_number: data.badge_number,
    checked_in_at: data.checked_in_at,
    photo_url: data.photo_url,
    property_name: data.properties.name,
  };
}
