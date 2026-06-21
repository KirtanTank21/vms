import { useState, useEffect, FormEvent, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { checkIn } from "../lib/api";
import { WebcamCapture } from "../components/WebcamCapture";
import type { UserProfile, HostOption } from "../types";

interface Props {
  profile: UserProfile | null;
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

const EMPTY_FORM = { name: "", phone: "", host_id: "", purpose: "" };

export function CheckInPage({ profile }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("users")
      .select("id, name")
      .eq("property_id", profile.property_id)
      .eq("role", "host")
      .order("name")
      .then(({ data }) => setHosts((data as HostOption[]) ?? []));
  }, [profile]);

  function set(field: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const handleCapture = useCallback((url: string) => setPhotoDataUrl(url), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let photo_url: string | undefined;

      if (photoDataUrl) {
        const blob = dataURLtoBlob(photoDataUrl);
        const path = `visitors/${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("visitor-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data } = supabase.storage.from("visitor-photos").getPublicUrl(path);
          photo_url = data.publicUrl;
        }
      }

      const selectedHost = hosts.find((h) => h.id === form.host_id);

      const visitor = await checkIn({
        name: form.name,
        phone: form.phone || undefined,
        photo_url,
        host_id: form.host_id,
        host_name: selectedHost?.name ?? "",
        purpose: form.purpose || undefined,
        property_id: profile.property_id,
        property_name: profile.property_name,
        logged_by: profile.id,
      });

      setSuccess(`${visitor.name} checked in — Pass #${visitor.badge_number}`);
      setForm(EMPTY_FORM);
      setPhotoDataUrl("");
      window.open(`/badge/${visitor.id}`, "_blank");
    } catch (err: any) {
      setError(err.message ?? "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">New Visitor Check-In</h2>
      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Visitor Name *</label>
            <input value={form.name} onChange={set("name")} required className="input-field" placeholder="Full name" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={form.phone} onChange={set("phone")} className="input-field" placeholder="10-digit number" />
          </div>
        </div>
        <div>
          <label className="label">Host *</label>
          <select value={form.host_id} onChange={set("host_id")} required className="input-field">
            <option value="">— select host —</option>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          {hosts.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No hosts registered yet. Ask admin to add host accounts.</p>
          )}
        </div>
        <div>
          <label className="label">Purpose of Visit</label>
          <input value={form.purpose} onChange={set("purpose")} className="input-field" placeholder="e.g. Meeting, Delivery" />
        </div>
        <div>
          <label className="label">Photo</label>
          <WebcamCapture onCapture={handleCapture} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium">{success}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Checking in…" : "Check In"}
        </button>
      </form>
    </div>
  );
}
