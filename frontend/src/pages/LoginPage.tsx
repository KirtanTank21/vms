import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabase";

const PHONE_DOMAIN = "@vms.local";

export function normalizePhone(input: string): string {
  // Strip everything except digits
  let digits = input.replace(/\D/g, "");
  // Strip leading 91 if it makes 12 digits (Indian country code)
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  // Strip leading 0 if 11 digits (some people type 09876...)
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function toEmail(phone: string): string {
  return normalizePhone(phone) + PHONE_DOMAIN;
}

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = toEmail(phone);
    console.log("[login] attempting sign-in with email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[login] signInWithPassword result — data:", data, "error:", error);
    if (error) {
      console.error("[login] sign-in failed:", error.message, error.status);
      setError("Incorrect phone number or password.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">VMS</h1>
        <p className="text-sm text-gray-500 mb-6">Visitor Management System</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="e.g. 9876543210"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
