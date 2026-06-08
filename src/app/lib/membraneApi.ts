// Membrane REST client — RBAC grant-management surface (loop e5183698, Phase 4b).
//
// This is the FIRST real membrane API client in the SPA (until now the app is
// seeded in-memory). It targets the Phase-4b grant routes in
// membrane/src/membrane/routes/grants.py, the WRITE side of team-tier RBAC
// (ADR b1384ebc D4 — Owner/Admin only; every mutation audited server-side).
//
// SCAFFOLD STATUS: the app has no login flow yet, so auth wiring is provisional.
// In production the membrane requires a Cognito JWT (sub + custom:org_id +
// custom:team_id); in dev mode it accepts X-Scope-* headers. This client sends a
// bearer token when one is configured, otherwise dev scope headers — matching
// how a laptop SPA talks to a local membrane. Real auth lands when the SPA's
// login flow is wired. All authority checks happen SERVER-SIDE regardless; the
// client cannot grant itself anything.

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

const BASE =
  (import.meta as { env?: Record<string, string> }).env?.VITE_MEMBRANE_BASE ??
  "https://dev.sagacityapps.com";

// Provisional auth: a membrane session bearer token if the host app stashed one.
function authHeaders(): Record<string, string> {
  try {
    const tok = window.localStorage.getItem("noodal.membraneToken");
    if (tok) return { Authorization: `Bearer ${tok}` };
  } catch {
    /* localStorage unavailable */
  }
  // Dev-mode fallback (membrane MEMBRANE_DEV_MODE=true accepts scope headers).
  return {
    "X-Scope-OrgId": "sagacity",
    "X-Scope-TeamId": "platform",
    "X-Scope-UserId": "pinkflipflop",
  };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function gangBase(communityId: string, gangId: string): string {
  return `/communities/${encodeURIComponent(communityId)}/gangs/${encodeURIComponent(gangId)}`;
}

// --- Members / seats (Owner/Admin only, audited server-side) ---

export const membraneApi = {
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
