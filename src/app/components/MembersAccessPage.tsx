import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { AdminShell } from "./AdminPages";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  membraneApi,
  type AccessLevel,
  type AccessSource,
  type GrantLevel,
  type MemberAccess,
  type MemberRow,
  type MemberTier,
} from "../lib/membraneApi";
import type { Corpus } from "../types";

// Members & Access — the WRITE side of the tree-as-access-view (design-input
// c33225fc): the tree shows what you can reach (visible-but-locked, Phase 3),
// this surface is where an Owner/Admin grants that reach. RBAC Phase 4b
// (loop e5183698, ADR b1384ebc D4 — Owner/Admin authority only; the Curator
// surfaces but cannot mutate). All authority + audit is enforced SERVER-SIDE in
// membrane.rbac_admin; this page only drives the audited grant routes.
//
// SCAFFOLD: the SPA has no data layer yet, so the gang/community IDs come in as
// props and the live calls only succeed once real UUIDs + auth are wired. The
// page degrades to a clear empty/error state until then.

interface MembersAccessPageProps {
  communityId: string;
  gangId: string;
  gangName: string;
  corpora: Corpus[];
  focusCorpusId?: string;
  onClose: () => void;
}

const TIER_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export function MembersAccessPage({
  communityId,
  gangId,
  gangName,
  corpora,
  focusCorpusId,
  onClose,
}: MembersAccessPageProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await membraneApi.listMembers(communityId, gangId));
    } catch (e) {
      setError((e as Error).message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [communityId, gangId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const guard = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      setBusy(key);
      setError(null);
      try {
        await fn();
        await reload();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );

  const invite = () =>
    guard("invite", async () => {
      await membraneApi.inviteMember(communityId, gangId, inviteId.trim());
      setInviteId("");
    });

  return (
    <AdminShell title={`Members & Access — ${gangName}`} onClose={onClose}>
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Seats & per-corpus access</h3>
          <p className="text-sm text-muted-foreground">
            Owner/Admin only. New members start deny-by-default — no corpus is
            reachable until you grant it. Every change is audited.
          </p>
        </div>

        {/* Invite */}
        <div className="border border-border rounded-lg p-4 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Invite member (Cognito sub)</label>
            <Input
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              placeholder="user sub, e.g. b49894e8-…"
            />
          </div>
          <Button onClick={invite} disabled={!inviteId.trim() || busy === "invite"}>
            {busy === "invite" ? "Inviting…" : "Invite"}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members loaded. (Scaffold: live data appears once real gang IDs +
            auth are wired.)
          </p>
        ) : (
          <div className="space-y-4">
            {members.map((m) => (
              <MemberCard
                key={m.member_id}
                member={m}
                communityId={communityId}
                gangId={gangId}
                corpora={corpora}
                focusCorpusId={focusCorpusId}
                busy={busy}
                onAction={guard}
              />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function MemberCard({
  member,
  communityId,
  gangId,
  corpora,
  focusCorpusId,
  busy,
  onAction,
}: {
  member: MemberRow;
  communityId: string;
  gangId: string;
  corpora: Corpus[];
  focusCorpusId?: string;
  busy: string | null;
  onAction: (key: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const isOwner = member.tier === "owner";
  const suspended = member.status === "suspended";

  // Read-back (loop b85f8a56): fetch this member's effective + explicit access so
  // each corpus row shows the CURRENT level + where it comes from — closing the
  // write-forward-blind gap. Degrades gracefully if the membrane lacks read-back.
  const [access, setAccess] = useState<MemberAccess | null>(null);
  const loadAccess = useCallback(async () => {
    try {
      setAccess(await membraneApi.getMemberAccess(communityId, gangId, member.member_id));
    } catch {
      setAccess(null);
    }
  }, [communityId, gangId, member.member_id]);
  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const effByCorpus = new Map((access?.effective ?? []).map((r) => [r.organism_id, r]));
  const explicitByCorpus = new Map(
    (access?.explicit.corpus_grants ?? []).map((g) => [g.organism_id, g.grant_level]),
  );

  // After a grant/revoke, refetch so the displayed level reflects the change
  // immediately (cache invalidation; "see what you just changed").
  const onGrantAction = async (key: string, fn: () => Promise<unknown>) => {
    await onAction(key, fn);
    await loadAccess();
  };

  const setTier = (tier: MemberTier) =>
    onAction(`tier-${member.member_id}`, () =>
      membraneApi.setMemberTier(communityId, gangId, member.member_id, tier),
    );

  const toggleSeat = () =>
    onAction(`seat-${member.member_id}`, () =>
      suspended
        ? membraneApi.reactivateMember(communityId, gangId, member.member_id)
        : membraneApi.suspendMember(communityId, gangId, member.member_id),
    );

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium truncate">{member.user_id}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {TIER_LABEL[member.tier ?? "member"]}
            {suspended && " · suspended"}
            {member.gang_wide_grant && ` · gang-wide ${member.gang_wide_grant}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            className="text-xs border border-border rounded px-1 py-0.5 bg-background"
            value={member.tier ?? ""}
            disabled={isOwner || busy?.startsWith(`tier-${member.member_id}`)}
            onChange={(e) => setTier((e.target.value || null) as MemberTier)}
            aria-label="tier"
          >
            <option value="">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <Button variant="ghost" size="sm" onClick={toggleSeat} disabled={isOwner}>
            {suspended ? "Reactivate" : "Suspend"}
          </Button>
        </div>
      </div>

      {/* Per-corpus grants — the tree-as-access-view, per member */}
      <div className="space-y-1">
        {corpora.map((c) => (
          <CorpusGrantRow
            key={c.id}
            corpus={c}
            highlight={c.id === focusCorpusId}
            disabled={isOwner}
            busy={busy === `grant-${member.member_id}-${c.id}`}
            effectiveLevel={isOwner ? "full" : effByCorpus.get(c.id)?.effective_level}
            source={isOwner ? "owner" : effByCorpus.get(c.id)?.source}
            currentGrant={explicitByCorpus.get(c.id) ?? null}
            onSet={(level) =>
              onGrantAction(`grant-${member.member_id}-${c.id}`, () =>
                level === null
                  ? membraneApi.revokeCorpusGrant(communityId, gangId, member.member_id, c.id)
                  : membraneApi.grantCorpusAccess(communityId, gangId, member.member_id, c.id, level),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

const SOURCE_LABEL: Record<AccessSource, string> = {
  per_corpus_grant: "direct",
  gang_wide_grant: "gang-wide",
  navigator_baseline: "baseline",
  owner: "owner",
  admin: "admin",
  none: "",
};

function AccessBadge({ level, source }: { level?: AccessLevel; source?: AccessSource }) {
  // Effective level + where it comes from, so inherited access (gang-wide /
  // baseline) is never mistaken for an explicit per-corpus grant (US-4).
  if (!level || level === "no-access") return null;
  const via = source ? SOURCE_LABEL[source] : "";
  return (
    <span
      className="text-[10px] rounded px-1 py-0.5 bg-muted text-muted-foreground shrink-0"
      title={`effective: ${level}${via ? ` (via ${via})` : ""}`}
    >
      {level}
      {via && via !== "direct" ? ` · ${via}` : ""}
    </span>
  );
}

function CorpusGrantRow({
  corpus,
  highlight,
  disabled,
  busy,
  effectiveLevel,
  source,
  currentGrant,
  onSet,
}: {
  corpus: Corpus;
  highlight: boolean;
  disabled: boolean;
  busy: boolean;
  effectiveLevel?: AccessLevel;
  source?: AccessSource;
  currentGrant: GrantLevel | null;
  onSet: (level: GrantLevel | null) => void;
}) {
  // The select edits the EXPLICIT per-corpus grant (controlled by currentGrant);
  // the badge shows the EFFECTIVE level + its source. Owner rows are disabled —
  // owners have full implicit access (the short-circuit) and aren't granted.
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
        highlight ? "bg-accent" : ""
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm truncate">
        {corpus.accessRole === "read-only" && (
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="locked" />
        )}
        {corpus.name}
        <AccessBadge level={effectiveLevel} source={source} />
      </span>
      <select
        className="text-xs border border-border rounded px-1 py-0.5 bg-background"
        value={currentGrant ?? ""}
        disabled={disabled || busy}
        onChange={(e) => onSet((e.target.value || null) as GrantLevel | null)}
        aria-label={`access for ${corpus.name}`}
      >
        <option value="">No access</option>
        <option value="observer">Observer</option>
        <option value="contributor">Contributor</option>
      </select>
    </div>
  );
}
