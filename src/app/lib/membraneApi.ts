// Membrane REST client — RBAC grant-management + live read surfaces.
//
// Started as the RBAC grant client (loop e5183698, Phase 4b — the WRITE side of
// team-tier RBAC, ADR b1384ebc D4, Owner/Admin only, audited server-side).
// connect-the-app v0 (loop 33c9f394 / spec bf4d7c86 C) extended it with the live
// READ surfaces (communities / gangs / corpora / loops) that replace the SPA's
// in-memory seeds, plus token-aware auth wiring (piece B).
//
// AUTH: the SPA login flow (membraneSession.ts) stores a Cognito ID token at
// localStorage["noodal.membraneToken"]; authHeaders() sends it as the bearer.
// With no token, it falls back to dev X-Scope-* headers (MEMBRANE_DEV_MODE) so
// the laptop loopback path keeps working with no login. On a 401 with a token,
// call() refreshes once and retries; if that fails it clears the session and
// emits the unauthorized signal (the app routes to login without leaking
// existence). All authority checks happen SERVER-SIDE; the client cannot grant
// itself anything.

import { BASE } from "./membraneBase";
import {
  clearMembraneSession,
  emitUnauthorized,
  getMembraneToken,
  refreshSession,
} from "./membraneSession";

export { BASE };

export type MemberTier = "owner" | "admin" | null;
export type GrantLevel = "observer" | "contributor";

// Read-back vocabulary (loop b85f8a56) — mirrors nucleus AccessLevel/AccessSource.
export type AccessLevel = "no-access" | "observer" | "contributor" | "full";
export type AccessSource =
  | "owner"
  | "admin"
  | "per_corpus_grant"
  | "gang_wide_grant"
  | "navigator_baseline"
  | "none";

export interface AccessSummary {
  observer_count: number;
  contributor_count: number;
  total_at_or_above_observer: number;
  gang_wide_grant: GrantLevel | null;
}

export interface MemberRow {
  member_id: string;
  user_id: string;
  status: "active" | "suspended";
  tier: MemberTier;
  gang_wide_grant: GrantLevel | null;
  corpus_grant_count: number;
  // Effective-based summary the roster now embeds (read-back); optional so the
  // page degrades gracefully against an older membrane.
  access_summary?: AccessSummary;
}

export interface EffectiveRow {
  organism_id: string;
  corpus_name: string | null;
  effective_level: AccessLevel;
  source: AccessSource;
}

export interface ExplicitGrant {
  organism_id: string;
  corpus_name: string | null;
  grant_level: GrantLevel;
  granted_by: string | null;
  granted_at: string | null;
}

export interface MemberAccess {
  member: { member_id: string; display: string; tier: MemberTier; status: string };
  gang_id: string;
  effective: EffectiveRow[]; // headline: what the member can actually reach
  explicit: { gang_wide_grant: GrantLevel | null; corpus_grants: ExplicitGrant[] }; // editable source of truth
}

export interface CorpusAccessMember {
  member_id: string;
  display: string;
  effective_level: AccessLevel;
  source: AccessSource;
}

export interface CorpusAccess {
  organism_id: string;
  corpus_name: string | null;
  members: CorpusAccessMember[];
}

export interface MyAccess {
  member_id: string;
  gang_id: string;
  effective: EffectiveRow[];
}

export interface AccessHistoryEvent {
  acting_principal: string;
  target_member: string | null;
  organism_id: string | null;
  old_level: string | null;
  new_level: string | null;
  change_type: string;
  timestamp: string | null;
}

// --- Live read surfaces (loop 33c9f394 / spec bf4d7c86 C) ---
// Minimal shapes — only the fields the rail/right-pane consume. Extra fields the
// membrane returns are ignored, so a newer membrane stays compatible.

export interface CommunityDTO {
  id: string;
  name: string;
}

export interface GangDTO {
  id: string;
  name: string;
  description?: string;
}

export interface CorpusDTO {
  organism_id: string;
  name: string;
  status?: string;
  tags?: Record<string, string>;
  aliases?: string[];
}

export interface LoopDTO {
  loop_id: string;
  workflow_id: string;
  title: string;
  status: string;
}

// Bearer token if the SPA has a Cognito session; otherwise the dev X-Scope
// fallback (membrane MEMBRANE_DEV_MODE=true accepts these), so the laptop
// loopback path works with no login flow (spec AC-5).
function authHeaders(): Record<string, string> {
  const tok = getMembraneToken();
  if (tok) return { Authorization: `Bearer ${tok}` };
  return {
    "X-Scope-OrgId": "sagacity",
    "X-Scope-TeamId": "platform",
    "X-Scope-UserId": "pinkflipflop",
  };
}

async function call<T>(method: string, path: string, body?: unknown, _retried = false): Promise<T> {
  const hadToken = !!getMembraneToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // A 401 on a token-bearing request means the ID token expired or is invalid.
  // Refresh once and retry; if refresh fails, clear the session and signal the
  // app to route to login. In the dev X-Scope path (no token) a 401 is a normal
  // access error and surfaces to the caller — there is no login to route to.
  if (res.status === 401 && hadToken && !_retried) {
    if (await refreshSession()) {
      return call<T>(method, path, body, true);
    }
    clearMembraneSession();
    emitUnauthorized();
  }

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
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function gangBase(communityId: string, gangId: string): string {
  return `/communities/${encodeURIComponent(communityId)}/gangs/${encodeURIComponent(gangId)}`;
}

export const membraneApi = {
  // --- Live reads: rail (communities → gangs → corpora) + per-corpus loops ---

  listCommunities(): Promise<CommunityDTO[]> {
    return call("GET", `/communities`);
  },

  listGangs(communityId: string): Promise<GangDTO[]> {
    return call("GET", `/communities/${encodeURIComponent(communityId)}/gangs`);
  },

  listGangCorpora(communityId: string, gangId: string): Promise<CorpusDTO[]> {
    return call("GET", `${gangBase(communityId, gangId)}/corpora`);
  },

  listLoops(organismId: string, status?: string): Promise<LoopDTO[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return call("GET", `/organisms/${encodeURIComponent(organismId)}/loops${qs}`);
  },

  // --- Members / seats (Owner/Admin only, audited server-side) ---

  listMembers(communityId: string, gangId: string): Promise<MemberRow[]> {
    return call("GET", `${gangBase(communityId, gangId)}/members`);
  },

  inviteMember(communityId: string, gangId: string, inviteeUserId: string, tier: MemberTier = null) {
    return call("POST", `${gangBase(communityId, gangId)}/members`, {
      invitee_user_id: inviteeUserId,
      tier,
    });
  },

  setMemberTier(communityId: string, gangId: string, memberId: string, tier: MemberTier) {
    return call("PATCH", `${gangBase(communityId, gangId)}/members/${memberId}/tier`, { tier });
  },

  suspendMember(communityId: string, gangId: string, memberId: string) {
    return call("POST", `${gangBase(communityId, gangId)}/members/${memberId}/suspend`);
  },

  reactivateMember(communityId: string, gangId: string, memberId: string) {
    return call("POST", `${gangBase(communityId, gangId)}/members/${memberId}/reactivate`);
  },

  // --- Grants (deny-by-default preserved; each write is one explicit row) ---

  grantCorpusAccess(
    communityId: string,
    gangId: string,
    memberId: string,
    organismId: string,
    grantLevel: GrantLevel,
  ) {
    return call(
      "PUT",
      `${gangBase(communityId, gangId)}/members/${memberId}/grants/${encodeURIComponent(organismId)}`,
      { grant_level: grantLevel },
    );
  },

  revokeCorpusGrant(communityId: string, gangId: string, memberId: string, organismId: string) {
    return call(
      "DELETE",
      `${gangBase(communityId, gangId)}/members/${memberId}/grants/${encodeURIComponent(organismId)}`,
    );
  },

  setGangWideGrant(
    communityId: string,
    gangId: string,
    memberId: string,
    grantLevel: GrantLevel | null,
  ) {
    return call("PUT", `${gangBase(communityId, gangId)}/members/${memberId}/gang-wide-grant`, {
      grant_level: grantLevel,
    });
  },

  // --- Read-back (loop b85f8a56) — see -> verify -> safely modify. READ-ONLY ---

  getMemberAccess(communityId: string, gangId: string, memberId: string): Promise<MemberAccess> {
    return call("GET", `${gangBase(communityId, gangId)}/members/${memberId}/access`);
  },

  getCorpusAccess(communityId: string, gangId: string, organismId: string): Promise<CorpusAccess> {
    return call(
      "GET",
      `${gangBase(communityId, gangId)}/corpora/${encodeURIComponent(organismId)}/access`,
    );
  },

  getMyAccess(communityId: string, gangId: string): Promise<MyAccess> {
    return call("GET", `${gangBase(communityId, gangId)}/me/access`);
  },

  getMemberAccessHistory(
    communityId: string,
    gangId: string,
    memberId: string,
  ): Promise<AccessHistoryEvent[]> {
    return call("GET", `${gangBase(communityId, gangId)}/members/${memberId}/access/history`);
  },

  getCorpusAccessHistory(
    communityId: string,
    gangId: string,
    organismId: string,
  ): Promise<AccessHistoryEvent[]> {
    return call(
      "GET",
      `${gangBase(communityId, gangId)}/corpora/${encodeURIComponent(organismId)}/access/history`,
    );
  },
};
