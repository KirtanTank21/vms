import { useState } from "react";
import { checkOut } from "../lib/api";
import type { Visitor } from "../types";

interface Props {
  visitor: Visitor;
  onCheckedOut: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function VisitorRow({ visitor, onCheckedOut }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      await checkOut(visitor.id);
      onCheckedOut();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {visitor.photo_url ? (
            <img src={visitor.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium shrink-0">
              {visitor.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{visitor.name}</p>
            <p className="text-xs text-gray-500">{visitor.phone}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-700">{visitor.host_name}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{visitor.purpose ?? "—"}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{formatTime(visitor.checked_in_at)}</td>
      <td className="py-3 px-4">
        <button onClick={handleCheckout} disabled={loading} className="btn-danger">
          {loading ? "..." : "Check out"}
        </button>
      </td>
    </tr>
  );
}
