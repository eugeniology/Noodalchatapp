export type CorpusStatus = "green" | "yellow";

export type LoopStatus = "OBSERVING" | "CLOSED" | "ACTIVE";

export type CorpusRole = "navigator" | "curator";

// Slice five: access role is orthogonal to CorpusStatus (health) and CorpusRole
// (navigator/curator character). Indicates the active user's access level
// against this corpus. "full" = read + write; "read-only" = view but composer
// is hard-disabled. UI seed sets this manually for the v1 scaffold; real
// values come from the RBAC system when loop 11af7fc9 lands. undefined is
// treated as "full" at render time.
export type CorpusAccessRole = "full" | "read-only";

export interface Corpus {
  id: string;
  name: string;
  status: CorpusStatus;
  // Slice four: role distinguishes navigator-character (engagement, exploratory,
  // cross-scope orientation) from curator-character (administrator, producer,
  // gang-internal). Per e3922a4d Phase A, gang curators wear both hats; Phase B
  // deploys a separate Navigator corpus per gang. UI seed marks both roles so
  // forward-compat is in place without backend Phase B.
  role?: CorpusRole;
  accessRole?: CorpusAccessRole;
}

export interface Gang {
  id: string;
  name: string;
  status?: CorpusStatus;
  corpora: Corpus[];
  // Slice four: pointer to this gang's designated curator corpus. Walking into a
  // gang and walking into its curator are the same gesture (c96e3b5d).
  curatorCorpusId?: string;
  // The community-admin gang IS the community level (c96e3b5d): the rail renders
  // the gang list with no dock-row and filters this gang out of it. With live
  // data the gang id is a UUID, so this is matched by flag, not by id string
  // (loop 33c9f394 / spec bf4d7c86 C).
  isCommunityHome?: boolean;
}

export interface Community {
  id: string;
  name: string;
  gangs: Gang[];
}

export interface ToolUse {
  id: string;
  name: string;
  status: "running" | "complete" | "error";
  result?: string;
}

// Q&A interrupt rendering primitive (spec Phase 7).
// Corpus-side WHEN-to-fire logic is deferred to sagacity-lead; slice three
// builds rendering + resolution only. While an unresolved QABlock lives in
// the active tab, the composer is hard-paused.
export interface QABlockSpec {
  id: string;
  prompt: string;
  options: { type: "single" | "multi"; choices: string[] };
  allowOther: boolean;
  allowSkip: boolean;
  allowStop: boolean;
}

export interface QABlockResolution {
  kind: "choice" | "other" | "skip" | "stop";
  choices?: string[];
  otherText?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolUse?: ToolUse[];
  qaBlock?: QABlockSpec;
  qaResolution?: QABlockResolution;
  isError?: boolean;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  corpusId: string;
  messages: Message[];
  timestamp: Date;
  title?: string;
}

export interface ChatTab {
  id: string;
  corpusId: string;
  corpusName: string;
  gangId: string;
  sessionId?: string;
  // User-renamed title; falls back to first-prompt derivation, then corpusName.
  title?: string;
  messages: Message[];
  // Cold-open opener (spec Phase 2). Populated by the noodal:cold-open subscriber,
  // not by appending to messages[]. The cold-open and welcome message converge
  // into this one field per spec ("converge into one mechanism").
  coldOpen?: Message | null;
  // Set when Continue Session forwards this tab. Renders a "→ continued in" marker.
  continuedInTabId?: string;
  // Placeholder streaming flag for slice three; real wiring lands in slice six.
  isStreaming?: boolean;
}

export interface ChatHistoryEntry {
  id: string;
  gangId?: string;
  corpusId?: string;
  timestamp: Date;
  title: string;
}

export interface Loop {
  id: string;
  name: string;
  status: LoopStatus;
}

export interface QuickAsk {
  id: string;
  text: string;
}
