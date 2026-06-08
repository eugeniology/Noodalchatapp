// Token storage helpers — localStorage-backed for the Models admin page.
//
// RETRACTION NOTE: locked decision d1678106 specified "session-only" for the
// LLM passthrough's BYOM key. Founder retracted that clause on 2026-05-12
// ("we don't want to do it session based"). Tokens now persist across reloads
// until the user explicitly clears them via the Models admin page.
//
// Security tradeoff: localStorage is readable by any JavaScript on the page
// (including via XSS). Acceptable for the current single-tenant local-browser-
// app phase. When the product moves to multi-tenant / hosted deployment,
// revisit with one of:
//   - HttpOnly cookies + backend proxy (preferred; removes browser-side keys)
//   - Encrypted-at-rest via WebCrypto + a user passphrase
//   - OS-level secret stores via a desktop wrapper (Electron / Tauri)

const CHAT_TOKEN_KEY = "noodal.chatToken";
const API_TOKEN_KEY = "noodal.apiToken";

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
    // localStorage can throw in private-mode Safari etc. Silently no-op so
    // the UI stays responsive; founder will see the value isn't persisted.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // see safeSet
  }
}

export function getChatToken(): string {
  return safeGet(CHAT_TOKEN_KEY);
}

export function setChatToken(value: string): void {
  safeSet(CHAT_TOKEN_KEY, value);
}

export function clearChatToken(): void {
  safeRemove(CHAT_TOKEN_KEY);
}

export function getApiToken(): string {
  return safeGet(API_TOKEN_KEY);
}

export function setApiToken(value: string): void {
  safeSet(API_TOKEN_KEY, value);
}

export function clearApiToken(): void {
  safeRemove(API_TOKEN_KEY);
}

// Mask a stored token for display: keep the last 4 chars visible, the rest
// shown as bullets. Returns empty string for empty input.
export function maskToken(value: string): string {
  if (!value) return "";
  const tail = value.slice(-4);
  return `••••••••${tail}`;
}

// Storage-event channel: the Models page writes; ScratchPad subscribes via
// window "storage" events. Note: native storage events only fire across
// different tabs. For same-tab cross-mount sync, dispatch a custom event too.
export const NOODAL_TOKENS_CHANGED = "noodal:tokens-changed";

export function notifyTokensChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(NOODAL_TOKENS_CHANGED));
  } catch {
    // SSR / non-browser context — safe no-op.
  }
}
