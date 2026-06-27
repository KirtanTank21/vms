export interface UserProfile {
  id: string;
  name: string;
  role: "guard" | "host" | "admin";
  property_id: string | null;
  property_name: string;
}

export interface HostOption {
  id: string;
  name: string;
}

export interface Property {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Unit {
  id: string;
  unit_number: string;
  host_id: string | null;
  users: { id: string; name: string } | null;
}

export type VisitorStatus = "pending" | "approved" | "rejected";

export interface Visitor {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  host_id: string | null;
  host_name: string | null;
  unit_id: string | null;
  unit_number: string | null;
  purpose: string | null;
  status: VisitorStatus;
  checked_in_at: string;
  checked_out_at: string | null;
  badge_number: string | null;
  property_id: string;
  logged_by: string | null;
}

export interface BadgeData {
  id: string;
  name: string;
  host_name: string;
  unit_number: string | null;
  purpose: string | null;
  badge_number: string | null;
  status: VisitorStatus;
  checked_in_at: string;
  photo_url: string | null;
  property_name: string;
}
