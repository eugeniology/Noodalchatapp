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
  corpora: Corpus[];
}

export interface Community {
  id: string;
  name: string;
  gangs: Gang[];
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolUse?: ToolUse[];
  timestamp: Date;
}

export interface ToolUse {
  id: string;
  name: string;
  status: "running" | "complete" | "error";
  result?: string;
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
  sessionId?: string;
  messages: Message[];
}

export interface ChatHistoryEntry {
  id: string;
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
