// ─── Admin Credentials (loaded from .env.local) ───────────────────────────────
export const ADMIN_CREDENTIALS = {
  email:    process.env.NEXT_PUBLIC_ADMIN_EMAIL    ?? "",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "",
} as const;

export const SESSION_KEY = "postrack_session";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function setSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, "authenticated");
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "authenticated";
}