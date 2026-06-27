import { supabase } from "./supabase";
import type { BadgeData, Unit } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

// ── Visitor self-checkin (public, no auth) ────────────────────────────────────

export async function selfCheckIn(payload: {
  name: string;
  phone?: string;
  purpose?: string;
  unit_id: string;
}): Promise<{ visitor_id: string }> {
  const res = await fetch(`${API_URL}/visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Check-in failed");
  return json;
}

// ── Host approve / reject ─────────────────────────────────────────────────────

export async function approveVisitor(visitorId: string): Promise<void> {
  const res = await fetch(`${API_URL}/visit/${visitorId}/approve`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.detail ?? "Failed to approve");
  }
}

export async function rejectVisitor(visitorId: string): Promise<void> {
  const res = await fetch(`${API_URL}/visit/${visitorId}/reject`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.detail ?? "Failed to reject");
  }
}

// ── Units ─────────────────────────────────────────────────────────────────────

export async function getUnits(propertyId: string): Promise<Unit[]> {
  const res = await fetch(`${API_URL}/units/${propertyId}`);
  if (!res.ok) throw new Error("Failed to load units");
  return res.json();
}

export async function getAdminProperties(): Promise<import("../types").Property[]> {
  const res = await fetch(`${API_URL}/admin/properties`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load buildings");
  return res.json();
}

export async function createProperty(payload: { name: string; address?: string }): Promise<import("../types").Property> {
  const res = await fetch(`${API_URL}/admin/property`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to create building");
  return json;
}

export async function createUnit(payload: { property_id: string; unit_number: string; host_id?: string }): Promise<Unit> {
  const res = await fetch(`${API_URL}/admin/units`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to create unit");
  return json;
}

export async function updateUnit(unitId: string, payload: { unit_number: string; host_id?: string }): Promise<Unit> {
  const res = await fetch(`${API_URL}/admin/units/${unitId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to update unit");
  return json;
}

export async function deleteUnit(unitId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/units/${unitId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete unit");
}

// ── Badge (public) ────────────────────────────────────────────────────────────

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
    unit_number: data.unit_number,
    purpose: data.purpose,
    badge_number: data.badge_number,
    status: data.status,
    checked_in_at: data.checked_in_at,
    photo_url: data.photo_url,
    property_name: data.properties?.name ?? "",
  };
}

// ── Checkout (guard/admin) ────────────────────────────────────────────────────

export async function checkOut(visitorId: string): Promise<void> {
  const { error } = await supabase
    .from("visitors")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", visitorId);

  if (error) throw new Error(error.message);
}
