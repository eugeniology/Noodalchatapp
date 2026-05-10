export type CorpusStatus = "green" | "yellow";

export type LoopStatus = "OBSERVING" | "CLOSED" | "ACTIVE";

export interface Corpus {
  id: string;
  name: string;
  status: CorpusStatus;
}

export interface Gang {
  id: string;
  name: string;
  status?: CorpusStatus;
  corpora: Corpus[];
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
