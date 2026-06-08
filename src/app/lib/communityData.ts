// Live rail data — replaces App.tsx's in-memory seedCommunity (loop 33c9f394 /
// spec bf4d7c86 C). Builds the Community → Gang → Corpus tree the rail renders
// from the membrane read routes, mapping organism_id onto Corpus.id so the
// Members & Access grant surface (which keys on the real organism UUID) works
// end-to-end.
//
// VISIBILITY-NOT-ERROR (b8dcfb02): when the caller has a real Cognito session we
// filter the rail by their RBAC at FETCH time — inaccessible corpora simply do
// not appear, and a gang the caller has no seat on (getMyAccess -> 403) drops
// out entirely. Clicks never produce "you can't access this". The dev X-Scope
// path (no token) is already a full server-side bypass under a legacy scope with
// no seats, so we skip filtering there and show everything — the laptop loopback
// keeps working (spec AC-5). Authority is enforced server-side regardless.

import {
  membraneApi,
  type CorpusDTO,
  type EffectiveRow,
  type GangDTO,
} from "./membraneApi";
import { hasMembraneSession } from "./membraneSession";
import type { Community, Corpus, CorpusAccessRole, CorpusRole, Gang } from "../types";

// The community the rail orients on. Prefer the platform community by name, else
// the first one the caller can see.
const PREFERRED_COMMUNITY = "sagacity";
// The gang that IS the community level (its curator is the community navigator).
const COMMUNITY_HOME_GANG = "community-admin";

function roleOf(c: CorpusDTO): CorpusRole | undefined {
  const tagged = c.tags?.role;
  if (tagged === "navigator" || tagged === "curator") return tagged;
  const aliases = c.aliases ?? [];
  if (aliases.includes("navigator")) return "navigator";
  if (aliases.includes("curator") || aliases.includes("gardener")) return "curator";
  return undefined;
}

// A gang's "curator corpus" is the one you land on when you walk into the gang.
// For the community-home gang that's the navigator; elsewhere it's the curator.
function isCuratorLike(c: CorpusDTO): boolean {
  const role = roleOf(c);
  return role === "curator" || role === "navigator";
}

function accessRoleFor(
  organismId: string,
  effective: Map<string, EffectiveRow> | null,
): CorpusAccessRole | undefined {
  if (!effective) return undefined; // unfiltered (dev path) → treat as full at render
  // observer = read but not write; contributor/full/owner = write. (types.ts:
  // undefined renders as "full".)
  return effective.get(organismId)?.effective_level === "observer" ? "read-only" : "full";
}

function mapCorpus(c: CorpusDTO, effective: Map<string, EffectiveRow> | null): Corpus {
  return {
    id: c.organism_id,
    name: c.name,
    status: "green", // health signal isn't on the read route; default to green
    role: roleOf(c),
    accessRole: accessRoleFor(c.organism_id, effective),
  };
}

async function buildGang(
  communityId: string,
  g: GangDTO,
  rbacFilter: boolean,
): Promise<Gang | null> {
  const corporaRaw = await membraneApi.listGangCorpora(communityId, g.id);

  // RBAC visibility filter (authenticated only).
  let effective: Map<string, EffectiveRow> | null = null;
  let visibleRaw = corporaRaw;
  if (rbacFilter) {
    try {
      const access = await membraneApi.getMyAccess(communityId, g.id);
      effective = new Map(access.effective.map((r) => [r.organism_id, r]));
      visibleRaw = corporaRaw.filter((c) => {
        const lvl = effective!.get(c.organism_id)?.effective_level;
        return !!lvl && lvl !== "no-access";
      });
    } catch (e) {
      // 403 = no seat on this gang → it isn't visible to this caller at all.
      // Any other failure (e.g. an older membrane lacking the route) degrades to
      // showing the gang unfiltered rather than blanking the rail.
      if ((e as { status?: number }).status === 403) return null;
      effective = null;
      visibleRaw = corporaRaw;
    }
  }

  if (visibleRaw.length === 0) return null; // nothing reachable → omit the gang

  const isHome = g.name === COMMUNITY_HOME_GANG;
  const corpora = visibleRaw.map((c) => mapCorpus(c, effective));
  const curatorRaw = visibleRaw.find(isCuratorLike) ?? corporaRaw.find(isCuratorLike);

  return {
    id: g.id,
    name: g.name,
    status: "green",
    isCommunityHome: isHome,
    curatorCorpusId: curatorRaw?.organism_id ?? corpora[0]?.id,
    corpora,
  };
}

/**
 * Load the live community tree for the rail. RBAC-filtered when the caller has a
 * Cognito session; unfiltered on the dev X-Scope path. Throws if no community is
 * reachable (the app shows a retriable error shell).
 */
export async function loadCommunity(): Promise<Community> {
  const rbacFilter = hasMembraneSession();

  const communities = await membraneApi.listCommunities();
  if (communities.length === 0) {
    throw new Error("No communities available for this account.");
  }
  const picked =
    communities.find((c) => c.name === PREFERRED_COMMUNITY) ?? communities[0];

  const gangsRaw = await membraneApi.listGangs(picked.id);
  const gangs = (
    await Promise.all(gangsRaw.map((g) => buildGang(picked.id, g, rbacFilter)))
  ).filter((g): g is Gang => g !== null);

  return { id: picked.id, name: picked.name, gangs };
}
