import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { AdminShell } from "./AdminPages";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { membraneApi, type GrantLevel, type MemberRow, type MemberTier } from "../lib/membraneApi";
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
            onSet={(level) =>
              onAction(`grant-${member.member_id}-${c.id}`, () =>
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

function CorpusGrantRow({
  corpus,
  highlight,
  disabled,
  busy,
  onSet,
}: {
  corpus: Corpus;
  highlight: boolean;
  disabled: boolean;
  busy: boolean;
  onSet: (level: GrantLevel | null) => void;
}) {
  // The current grant level isn't returned per-corpus by the roster endpoint
  // yet; the control is write-forward (set/clear). Owner rows are disabled —
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
      </span>
      <select
        className="text-xs border border-border rounded px-1 py-0.5 bg-background"
        defaultValue=""
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
