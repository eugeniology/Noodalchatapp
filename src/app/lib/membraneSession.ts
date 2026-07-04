// Membrane auth/session — Cognito login, token storage, refresh, identity.
// connect-the-app v0, piece B (loop 33c9f394 / spec bf4d7c86).
//
// The auth BACKEND already exists (membrane routes/auth.py: /auth/login,
// /auth/refresh, /auth/me; boto3 Cognito). This module is the SPA's session
// layer over it: it obtains a token and stashes it at the contract key
// localStorage["noodal.membraneToken"] that membraneApi.ts already reads as the
// Authorization bearer.
//
// WHICH TOKEN: membrane validates the bearer and reads custom:org_id /
// custom:team_id / sub from it. Cognito puts those custom claims on the ID
// token, NOT the access token (see membrane/auth.py _verify_cognito_token).
// So the ID token is what we store as the bearer.
//
// LOCAL-VERSION-REQUIRED: this is ADDITIVE. When no token is present the app
// runs the existing dev X-Scope fallback (membraneApi.authHeaders) — the laptop
// loopback path keeps working with no login flow. All authority is server-side.

import { BASE } from "./membraneBase";

// --- Token contract ---
// membraneToken is the bearer (the Cognito ID token). refresh + userId are kept
// so /auth/refresh (which requires the sub) can mint a fresh ID token.
const TOKEN_KEY = "noodal.membraneToken";
const REFRESH_KEY = "noodal.membraneRefreshToken";
const USER_KEY = "noodal.membraneUserId";

export interface AuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  user_id: string;
  token_type: string;
  expires_in: number;
}

export interface UserInfo {
  user_id: string;
  email: string;
  org_id: string;
  team_id: string;
}

function safeGet(key: string): string {
  try {
    return (typeof localStorage !== "undefined" && localStorage.getItem(key)) || "";
  } catch {
    return "";
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* private-mode Safari etc — no-op */
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* see safeSet */
  }
}

export function getMembraneToken(): string {
  return safeGet(TOKEN_KEY);
}

/** True when a real Cognito session is stored (vs the dev X-Scope fallback). */
export function hasMembraneSession(): boolean {
  return !!safeGet(TOKEN_KEY);
}

function storeTokens(t: { id_token: string; refresh_token?: string; user_id?: string }): void {
  if (t.id_token) safeSet(TOKEN_KEY, t.id_token);
  if (t.refresh_token) safeSet(REFRESH_KEY, t.refresh_token);
  if (t.user_id) safeSet(USER_KEY, t.user_id);
}

export function clearMembraneSession(): void {
  safeRemove(TOKEN_KEY);
  safeRemove(REFRESH_KEY);
  safeRemove(USER_KEY);
}

// --- Unauthorized signal ---
// Emitted when a token-bearing request fails auth and cannot be refreshed. The
// app subscribes and routes to the login screen (prod) or falls back to the dev
// X-Scope path (dev). Carries no existence information — purely "your session is
// gone" (spec AC-1: 401 returns to login without leaking existence).
export const NOODAL_UNAUTHORIZED = "noodal:unauthorized";

export function emitUnauthorized(): void {
  try {
    window.dispatchEvent(new CustomEvent(NOODAL_UNAUTHORIZED));
  } catch {
    /* non-browser context */
  }
}

export function subscribeUnauthorized(cb: () => void): () => void {
  window.addEventListener(NOODAL_UNAUTHORIZED, cb);
  return () => window.removeEventListener(NOODAL_UNAUTHORIZED, cb);
}

// --- Auth calls (raw fetch; these must not go through membraneApi.call, which
//     itself triggers refresh-on-401 — that would recurse) ---

async function authFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      detail = (await res.json())?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

/**
 * Log in with email + password. Stores the Cognito ID token at the bearer key
 * membraneApi already reads, plus the refresh token + sub for /auth/refresh.
 * Throws on failure — the membrane returns a generic "Invalid email or
 * password" (401) that does not reveal whether the account exists.
 */
export async function login(email: string, password: string): Promise<UserInfo> {
  const t = await authFetch<AuthTokenResponse>("/auth/login", { email, password });
  storeTokens(t);
  return getMe();
}

export function logout(): void {
  clearMembraneSession();
}

// --- Self-serve password reset (loop 3949ec15) ---
// Two unauthenticated steps mirroring the membrane /auth/forgot-password +
// /auth/reset-password endpoints. Step 1 asks Cognito to email a reset code to
// the user's verified address (email_verified=true is set at invite time,
// gotcha 3794a78a); step 2 confirms the code and sets the new password, after
// which the user can log in normally. Neither stores a session — the caller
// routes to /login on success.

export interface MessageResponse {
  message: string;
}

/**
 * Step 1 — request a reset code. Resolves regardless of whether the account
 * exists (the membrane returns a fixed generic acknowledgement so nothing about
 * account existence leaks). Rejects only on throttling (429) or an infra fault
 * (503); the screen surfaces those as "try again later".
 */
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  return authFetch<MessageResponse>("/auth/forgot-password", { email });
}

/**
 * Step 2 — submit the emailed code + new password. Rejects with a generic
 * "Invalid or expired reset code" (400) on a bad/expired code, the Cognito
 * password-policy message (400) if the new password is too weak, or a 429/503
 * on throttle/infra. Resolves once the password is set.
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<MessageResponse> {
  return authFetch<MessageResponse>("/auth/reset-password", {
    email,
    code,
    new_password: newPassword,
  });
}

/** GET /auth/me using the stored bearer. Throws (status 401) if invalid. */
export async function getMe(): Promise<UserInfo> {
  const token = getMembraneToken();
  const res = await fetch(`${BASE}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = new Error("Not authenticated");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as UserInfo;
}

// Single-flight refresh: concurrent 401s share one /auth/refresh round-trip.
let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh_token = safeGet(REFRESH_KEY);
  const user_id = safeGet(USER_KEY);
  if (!refresh_token || !user_id) return false;
  try {
    const t = await authFetch<AuthTokenResponse>("/auth/refresh", { refresh_token, user_id });
    // /auth/refresh returns a fresh id_token; the refresh token is unchanged and
    // user_id is not re-sent, so keep the existing ones.
    storeTokens({ id_token: t.id_token });
    return true;
  } catch {
    return false;
  }
}

/** Attempt to refresh the ID token. Returns true on success. Single-flight. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Boot-time validation: confirm the stored session is live, refreshing once if
 * the ID token has expired. Returns the identity or null (caller clears + routes
 * to login). Used by the app gate; does NOT emit the unauthorized event (boot is
 * not a mid-session expiry).
 */
export async function validateSession(): Promise<UserInfo | null> {
  if (!hasMembraneSession()) return null;
  try {
    return await getMe();
  } catch (e) {
    if ((e as { status?: number }).status === 401 && (await refreshSession())) {
      try {
        return await getMe();
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}
