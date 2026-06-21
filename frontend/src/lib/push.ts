import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL as string;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function authHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? ""}`;
}

export async function registerPush(userId: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const subscription = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  });

  await fetch(`${API_URL}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": await authHeader(),
    },
    body: JSON.stringify({ user_id: userId, subscription }),
  });
}

export async function unregisterPush(userId: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await reg?.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();

  await fetch(`${API_URL}/push/subscribe?user_id=${userId}`, {
    method: "DELETE",
    headers: { "Authorization": await authHeader() },
  });
}
