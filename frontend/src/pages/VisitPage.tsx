import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUnits, selfCheckIn } from "../lib/api";
import type { Unit } from "../types";

const EMPTY = { name: "", phone: "", purpose: "", unit_id: "" };

export function VisitPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    getUnits(propertyId)
      .then(setUnits)
      .catch(() => setError("Could not load unit list. Please try again."))
      .finally(() => setLoadingUnits(false));
  }, [propertyId]);

  function set(field: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { visitor_id } = await selfCheckIn({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        purpose: form.purpose.trim() || undefined,
        unit_id: form.unit_id,
      });
      navigate(`/visitor/${visitor_id}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingUnits) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">VMS</h1>
          <p className="text-sm text-gray-500 mt-1">Visitor Check-In</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Your Name *</label>
              <input
                value={form.name}
                onChange={set("name")}
                required
                autoFocus
                className="input-field"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                className="input-field"
                placeholder="10-digit number"
              />
            </div>

            <div>
              <label className="label">Flat / Unit *</label>
              {units.length === 0 ? (
                <p className="text-sm text-amber-600">No units configured yet. Please contact the admin.</p>
              ) : (
                <select value={form.unit_id} onChange={set("unit_id")} required className="input-field">
                  <option value="">— select flat / unit —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number}{u.users ? ` — ${u.users.name}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label">Purpose of Visit</label>
              <input
                value={form.purpose}
                onChange={set("purpose")}
                className="input-field"
                placeholder="e.g. Meeting, Delivery, Personal"
              />
            </div>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || units.length === 0}
              className="btn-primary mt-1"
            >
              {loading ? "Submitting…" : "Request Entry"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your request will be sent to the resident for approval.
        </p>
      </div>
    </div>
  );
}
