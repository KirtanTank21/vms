import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabase";
import type { UserProfile } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

interface Props {
  profile: UserProfile | null;
}

const EMPTY_FORM = { name: "", phone: "", password: "", role: "guard" };

export function AdminPage({ profile }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!profile || profile.role !== "admin") return null;

  function set(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? "Failed to register user");

      setSuccess(`${json.name} (${json.role}) registered successfully.`);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Register Staff</h2>
      <p className="text-sm text-gray-500 mb-4">
        New staff can log in immediately with their phone number and password.
      </p>
      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-4">
        <div>
          <label className="label">Full Name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            className="input-field"
            placeholder="e.g. Ravi Kumar"
          />
        </div>
        <div>
          <label className="label">Phone Number *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            required
            className="input-field"
            placeholder="e.g. 9876543210"
          />
          <p className="text-xs text-gray-400 mt-1">10-digit number. Country code (+91) handled automatically.</p>
        </div>
        <div>
          <label className="label">Password *</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            required
            minLength={8}
            className="input-field"
            placeholder="Minimum 8 characters"
          />
          <p className="text-xs text-gray-400 mt-1">Share this with the staff member.</p>
        </div>
        <div>
          <label className="label">Role *</label>
          <select value={form.role} onChange={set("role")} required className="input-field">
            <option value="guard">Guard / Security</option>
            <option value="host">Host / Employee</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Guards handle check-ins. Hosts receive notifications when visitors arrive.</p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium">{success}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Registering…" : "Register Staff"}
        </button>
      </form>
    </div>
  );
}
