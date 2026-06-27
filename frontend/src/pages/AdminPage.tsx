import { useState, FormEvent, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { createUnit, deleteUnit, getAdminProperties, createProperty } from "../lib/api";
import type { UserProfile, Unit, Property } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

interface Props {
  profile: UserProfile | null;
  onPropertyCreated: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Building List
// ─────────────────────────────────────────────────────────────────────────────

function BuildingList({
  onSelect,
}: {
  onSelect: (p: Property) => void;
}) {
  const [buildings, setBuildings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setBuildings(await getAdminProperties());
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await createProperty({ name: form.name, address: form.address || undefined });
      setBuildings((prev) => [...prev, created]);
      setForm({ name: "", address: "" });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 text-sm py-16">Loading…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Buildings</h2>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm">
          {showForm ? "Cancel" : "+ Add Building"}
        </button>
      </div>

      {/* Add building form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card p-4 flex flex-col gap-4 mb-6">
          <p className="text-sm font-medium text-gray-700">New Building</p>
          <div>
            <label className="label">Building Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
              className="input-field"
              placeholder="e.g. Sunshine Apartments"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="input-field"
              placeholder="e.g. 12 MG Road, Ahmedabad"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Adding…" : "Add Building"}
          </button>
        </form>
      )}

      {/* Building cards */}
      {buildings.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm">
          No buildings yet. Add your first building above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="card p-4 text-left hover:border-blue-300 hover:shadow-md transition-all w-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{b.name}</p>
                  {b.address && <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>}
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Building Detail
// ─────────────────────────────────────────────────────────────────────────────

function BuildingDetail({
  building,
  onBack,
  adminId,
}: {
  building: Property;
  onBack: () => void;
  adminId: string;
}) {
  const [tab, setTab] = useState<"flats" | "guard">("flats");
  const [units, setUnits] = useState<Unit[]>([]);

  const [flatForm, setFlatForm] = useState({ unit: "", flat_number: "", owner_name: "", owner_phone: "", owner_password: "" });
  const [flatLoading, setFlatLoading] = useState(false);
  const [flatError, setFlatError] = useState<string | null>(null);
  const [flatSuccess, setFlatSuccess] = useState<string | null>(null);

  const [guardForm, setGuardForm] = useState({ name: "", phone: "", password: "" });
  const [guardLoading, setGuardLoading] = useState(false);
  const [guardError, setGuardError] = useState<string | null>(null);
  const [guardSuccess, setGuardSuccess] = useState<string | null>(null);

  const visitUrl = `${window.location.origin}/visit/${building.id}`;

  useEffect(() => { loadUnits(); }, [building.id]);

  async function loadUnits() {
    const { data } = await supabase
      .from("units")
      .select("id, unit_number, host_id, users(id, name, email)")
      .eq("property_id", building.id)
      .order("unit_number");
    setUnits((data as any[]) ?? []);
  }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function registerUser(name: string, phone: string, password: string, role: string) {
    const token = await getToken();
    const res = await fetch(`${API_URL}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, phone, password, role, property_id: building.id }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail ?? "Failed to register user");
    return json as { id: string; name: string };
  }

  async function handleFlatSubmit(e: FormEvent) {
    e.preventDefault();
    setFlatError(null);
    setFlatSuccess(null);
    setFlatLoading(true);
    try {
      const unitNumber = flatForm.unit
        ? `${flatForm.unit.trim()}-${flatForm.flat_number.trim()}`
        : flatForm.flat_number.trim();
      const host = await registerUser(flatForm.owner_name, flatForm.owner_phone, flatForm.owner_password, "host");
      try {
        await createUnit({ property_id: building.id, unit_number: unitNumber, host_id: host.id });
      } catch (unitErr: any) {
        setFlatError(`Owner created but flat failed: ${unitErr.message}. Add the flat again — owner account already exists.`);
        setFlatLoading(false);
        loadUnits();
        return;
      }
      setFlatSuccess(`Flat ${unitNumber} added with owner ${host.name}.`);
      setFlatForm({ unit: "", flat_number: "", owner_name: "", owner_phone: "", owner_password: "" });
      loadUnits();
    } catch (err: any) {
      setFlatError(err.message);
    } finally {
      setFlatLoading(false);
    }
  }

  async function handleGuardSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardError(null);
    setGuardSuccess(null);
    setGuardLoading(true);
    try {
      const guard = await registerUser(guardForm.name, guardForm.phone, guardForm.password, "guard");
      setGuardSuccess(`${guard.name} registered as guard.`);
      setGuardForm({ name: "", phone: "", password: "" });
    } catch (err: any) {
      setGuardError(err.message);
    } finally {
      setGuardLoading(false);
    }
  }

  async function handleDeleteUnit(unitId: string, unitNumber: string) {
    if (!confirm(`Delete Flat ${unitNumber}? This cannot be undone.`)) return;
    try {
      await deleteUnit(unitId);
      loadUnits();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function setFlat(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFlatForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function setGuard(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setGuardForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-xl leading-none">‹</button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{building.name}</h2>
          {building.address && <p className="text-xs text-gray-400">{building.address}</p>}
        </div>
      </div>

      {/* QR code */}
      <div className="card p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-1">Visitor Check-In QR Code</p>
        <p className="text-xs text-gray-500 mb-4">
          Print or display at the entrance. Visitors scan to request entry.
        </p>
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white border border-gray-200 rounded-xl inline-block" id="qr-wrapper">
            <QRCodeSVG value={visitUrl} size={180} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(visitUrl)}
            className="btn-secondary text-sm flex-1"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={() => {
              const svg = document.querySelector("#qr-wrapper svg") as SVGElement;
              if (!svg) return;
              const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${building.name}-qr.svg`;
              a.click();
            }}
            className="btn-secondary text-sm flex-1"
          >
            Download QR
          </button>
          <button type="button" onClick={() => window.print()} className="btn-secondary text-sm flex-1">
            Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {(["flats", "guard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            {t === "flats" ? "Flats & Owners" : "Register Guard"}
          </button>
        ))}
      </div>

      {/* Flats tab */}
      {tab === "flats" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={handleFlatSubmit} className="card p-4 flex flex-col gap-4">
            <p className="text-sm font-medium text-gray-700">Add Flat & Owner</p>
            <div className="h-px bg-gray-100" />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Unit / Block</label>
                <input value={flatForm.unit} onChange={setFlat("unit")} className="input-field" placeholder="e.g. A, B, Tower 1" />
                <p className="text-xs text-gray-400 mt-1">Optional</p>
              </div>
              <div className="flex-1">
                <label className="label">Flat No. *</label>
                <input value={flatForm.flat_number} onChange={setFlat("flat_number")} required className="input-field" placeholder="e.g. 101, 202" />
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Owner / Resident</p>
            <div>
              <label className="label">Full Name *</label>
              <input value={flatForm.owner_name} onChange={setFlat("owner_name")} required className="input-field" placeholder="e.g. Rahul Mehta" />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="tel" value={flatForm.owner_phone} onChange={setFlat("owner_phone")} required className="input-field" placeholder="10-digit number" />
              <p className="text-xs text-gray-400 mt-1">Used as their login username.</p>
            </div>
            <div>
              <label className="label">Login Password *</label>
              <input type="password" value={flatForm.owner_password} onChange={setFlat("owner_password")} required minLength={8} className="input-field" placeholder="Min 8 characters" />
            </div>
            {flatError && <p className="text-red-600 text-sm">{flatError}</p>}
            {flatSuccess && <p className="text-green-600 text-sm font-medium">{flatSuccess}</p>}
            <button type="submit" disabled={flatLoading} className="btn-primary">
              {flatLoading ? "Adding…" : "Add Flat & Owner"}
            </button>
          </form>

          {units.length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-gray-600">Flat</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600">Owner</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600">Phone</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{u.unit_number}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {(u as any).users?.name ?? <span className="text-gray-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {(u as any).users?.email
                          ? (u as any).users.email.replace("@vms.local", "")
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteUnit(u.id, u.unit_number)} className="text-xs text-red-500 hover:text-red-700">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Guard tab */}
      {tab === "guard" && (
        <form onSubmit={handleGuardSubmit} className="card p-4 flex flex-col gap-4">
          <p className="text-sm text-gray-500">Register a security guard for this building.</p>
          <div>
            <label className="label">Full Name *</label>
            <input value={guardForm.name} onChange={setGuard("name")} required className="input-field" placeholder="e.g. Suresh Kumar" />
          </div>
          <div>
            <label className="label">Phone Number *</label>
            <input type="tel" value={guardForm.phone} onChange={setGuard("phone")} required className="input-field" placeholder="10-digit number" />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" value={guardForm.password} onChange={setGuard("password")} required minLength={8} className="input-field" placeholder="Min 8 characters" />
          </div>
          {guardError && <p className="text-red-600 text-sm">{guardError}</p>}
          {guardSuccess && <p className="text-green-600 text-sm font-medium">{guardSuccess}</p>}
          <button type="submit" disabled={guardLoading} className="btn-primary">
            {guardLoading ? "Registering…" : "Register Guard"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Page root
// ─────────────────────────────────────────────────────────────────────────────

export function AdminPage({ profile, onPropertyCreated }: Props) {
  const [selected, setSelected] = useState<Property | null>(null);

  if (!profile || profile.role !== "admin") return null;

  return selected ? (
    <BuildingDetail
      building={selected}
      onBack={() => setSelected(null)}
      adminId={profile.id}
    />
  ) : (
    <BuildingList onSelect={setSelected} />
  );
}
