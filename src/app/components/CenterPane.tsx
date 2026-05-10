import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X, Paperclip, Send, Square, Plus, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { welcomeMessageFor } from "../App";
import type {
  ChatTab,
  Community,
  Message,
  QABlockResolution,
  ToolUse,
} from "../types";

interface CenterPaneProps {
  community: Community;
  currentGangId: string | null;
  tabs: ChatTab[];
  activeTabId: string | null;
  onTabClose: (tabId: string) => void;
  onTabSelect: (tabId: string) => void;
  onTabRename: (tabId: string, title: string) => void;
  onAutoEvict: (tabIds: string[]) => void;
  onNewSession: () => void;
  onSendMessage: (tabId: string, content: string) => void;
  onContinueSession: (tabId: string) => void;
  onLandInCorpus: (gangId: string, corpusId: string) => void;
  onColdOpenReady: (gangId: string, tabId: string, message: Message) => void;
  onResolveQA: (tabId: string, messageId: string, resolution: QABlockResolution) => void;
  onRetryMessage: (tabId: string, messageId: string) => void;
}

// Equal-width tab sizing constants. Min-width sets the floor that triggers
// auto-evict-oldest when the strip cannot fit any more tabs at that width.
const MIN_TAB_WIDTH = 140;
const MAX_TAB_WIDTH = 220;
const NEW_SESSION_RESERVED = 120; // "+ new session" button + padding

// File-attach whitelist (spec Phase 5): text-extractable docs, structured data,
// images for vision. Archives, executables, and media are rejected.
const ATTACH_ACCEPT = [
  ".txt", ".md", ".markdown", ".rtf", ".pdf",
  ".doc", ".docx", ".odt", ".html", ".htm",
  ".csv", ".tsv", ".json", ".jsonl", ".xml", ".yaml", ".yml",
  ".xlsx", ".xls",
  "image/*",
].join(",");

export function CenterPane({
  community,
  currentGangId,
  tabs,
  activeTabId,
  onTabClose,
  onTabSelect,
  onTabRename,
  onAutoEvict,
  onNewSession,
  onSendMessage,
  onContinueSession,
  onLandInCorpus,
  onColdOpenReady,
  onResolveQA,
  onRetryMessage,
}: CenterPaneProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const hasUnresolvedQA = useMemo(
    () => activeTab?.messages.some((m) => m.qaBlock && !m.qaResolution) ?? false,
    [activeTab],
  );
  const isStreaming = activeTab?.isStreaming ?? false;
  const composerDisabled = isStreaming || hasUnresolvedQA;

  // Cold-open opener subscriber (spec Phase 2 + cross-cutting decision e0d67b77).
  // The subscriber computes welcomeMessageFor(corpusName) on event and calls
  // back to App to write it into the target tab's coldOpen field. App seeds
  // tabs with coldOpen=null so this is the single population path — converging
  // the cold-open and demo welcome message into one mechanism per spec.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ corpusId: string; gangId: string; tabId: string }>).detail;
      if (!detail) return;
      const gang = community.gangs.find((g) => g.id === detail.gangId);
      const corpus = gang?.corpora.find((c) => c.id === detail.corpusId);
      if (!gang || !corpus) return;
      onColdOpenReady(gang.id, detail.tabId, welcomeMessageFor(corpus.name));
    };
    window.addEventListener("noodal:cold-open", handler);
    return () => window.removeEventListener("noodal:cold-open", handler);
  }, [community, onColdOpenReady]);

  // Width-driven visible count. Equal-width tabs fill the strip; when there are
  // more tabs than fit at MIN_TAB_WIDTH, the oldest are auto-evicted into the
  // gang's Chat history (spec Phase 1, no fixed cap).
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripWidth, setStripWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    setStripWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setStripWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const visibleCount = Math.max(1, Math.floor(stripWidth / MIN_TAB_WIDTH));

  useEffect(() => {
    if (tabs.length <= visibleCount) return;
    const excess = tabs.length - visibleCount;
    const toEvict = tabs.slice(0, excess).map((t) => t.id);
    if (toEvict.length > 0) onAutoEvict(toEvict);
  }, [tabs, visibleCount, onAutoEvict]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeTab || composerDisabled) return;
    const prefix = attachedFile ? `Attached: ${attachedFile.name}\n` : "";
    onSendMessage(activeTab.id, prefix + input);
    setInput("");
    setAttachedFile(null);
  }, [activeTab, attachedFile, composerDisabled, input, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Stubbed onFileAttached — files-as-metabolism is corpus-side and deferred.
    console.log("[onFileAttached stub]", { name: file.name, type: file.type, size: file.size });
    setAttachedFile(file);
    e.target.value = "";
  };

  const handleStop = () => {
    // Stubbed stop — real streaming wire-up lands in slice six.
    console.log("[onStop stub] would abort the in-flight response, partial response remains in chat");
  };

  // Stubbed loop overlay (spec Phase 4). Overlay specifics deferred per locked
  // decisions — slice three only emits the click hook.
  const openLoopOverlay = useCallback((loopId: string) => {
    console.log("[openLoopOverlay stub]", loopId);
  }, []);

  if (!currentGangId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a gang from the left rail to start
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip: equal-width, dynamic visible count, auto-evict-oldest,
          "+ new session" pinned far right. Active tab visually attached to
          the chat surface — no border between tab and body. */}
      <div className="border-b border-border bg-background flex items-stretch px-2 gap-1 min-h-10">
        <div ref={stripRef} className="flex-1 min-w-0 flex items-stretch gap-1">
          {tabs.map((tab) => (
            <TabPill
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              isRenaming={renamingTabId === tab.id}
              onSelect={() => {
                if (tab.id === activeTabId) setRenamingTabId(tab.id);
                else onTabSelect(tab.id);
              }}
              onStartRename={() => setRenamingTabId(tab.id)}
              onCommitRename={(title) => {
                onTabRename(tab.id, title);
                setRenamingTabId(null);
              }}
              onCancelRename={() => setRenamingTabId(null)}
              onClose={() => onTabClose(tab.id)}
              maxWidth={MAX_TAB_WIDTH}
              reservedRight={NEW_SESSION_RESERVED}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="shrink-0 self-center text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/40"
          title="Open a fresh session"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>new session</span>
        </button>
      </div>

      {activeTab ? (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
              {activeTab.coldOpen && (
                <ColdOpenMessage
                  message={activeTab.coldOpen}
                  onLandInCorpus={onLandInCorpus}
                  onOpenLoop={openLoopOverlay}
                />
              )}
              {activeTab.messages.map((message) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  onLandInCorpus={onLandInCorpus}
                  onOpenLoop={openLoopOverlay}
                  onResolveQA={(resolution) => onResolveQA(activeTab.id, message.id, resolution)}
                  onRetry={() => onRetryMessage(activeTab.id, message.id)}
                />
              ))}
              {activeTab.continuedInTabId && (
                <ContinuedInMarker
                  targetTabId={activeTab.continuedInTabId}
                  onJump={() => onTabSelect(activeTab.continuedInTabId!)}
                />
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 bg-background">
            <div className="max-w-4xl mx-auto w-full space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onContinueSession(activeTab.id)}
                  className="rounded-full"
                >
                  Continue Session
                </Button>
              </div>
              {attachedFile && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAttachClick}
                  disabled={composerDisabled}
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ATTACH_ACCEPT}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex-1 relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasUnresolvedQA ? "waiting on your answer" : "Message..."}
                    className="min-h-[60px] resize-none"
                    disabled={composerDisabled}
                  />
                </div>
                {isStreaming ? (
                  <StopButton onStop={handleStop} />
                ) : (
                  <Button
                    onClick={handleSend}
                    size="icon"
                    disabled={!input.trim() || composerDisabled}
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {hasUnresolvedQA
                  ? "waiting on your answer"
                  : "Cmd+Enter to send, Enter for new line"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Open a corpus from the left rail or click + new session
        </div>
      )}
    </div>
  );
}

// Tab pill: equal-width within the strip via flex-1 / min-w / max-w. Title is
// click-to-rename when the tab is already active; clicking inactive tabs
// selects them. × is always visible on the active tab and on hover otherwise.
function TabPill({
  tab,
  isActive,
  isRenaming,
  onSelect,
  onStartRename: _onStartRename,
  onCommitRename,
  onCancelRename,
  onClose,
  maxWidth,
  reservedRight: _reservedRight,
}: {
  tab: ChatTab;
  isActive: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (title: string) => void;
  onCancelRename: () => void;
  onClose: () => void;
  maxWidth: number;
  reservedRight: number;
}) {
  const [draft, setDraft] = useState(tab.title ?? tab.corpusName);
  useEffect(() => {
    if (isRenaming) setDraft(tab.title ?? tab.corpusName);
  }, [isRenaming, tab.title, tab.corpusName]);

  const displayTitle = tab.title ?? tab.corpusName;

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      style={{ maxWidth }}
      className={`group relative flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer text-sm ${
        isActive
          ? // -mb-px lifts the active tab over the strip's bottom border so it
            // visually attaches to the chat body (spec Phase 1).
            "relative -mb-px bg-background border-x border-t border-border"
          : "border border-transparent hover:bg-muted/30"
      }`}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommitRename(draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancelRename();
            }
          }}
          onBlur={() => onCommitRename(draft)}
          className="flex-1 min-w-0 bg-transparent outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate" title={displayTitle}>
          {displayTitle}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close tab"
        className={`shrink-0 rounded p-0.5 hover:bg-muted ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Inline link parser (spec Phase 4 + cross-cutting decision 2e32b6b7).
// Combined-regex pass handles all three forms in one walk over the content.
//   [[corpus:gangId/corpusId|Display]]  → dotted-underline button, calls onLandInCorpus
//   [[loop:loopId|Display]]             → dotted-underline button, calls onOpenLoop (stub)
//   [[artifact:artifactId|Display]]     → muted span, non-interactive (provenance only)
const INLINE_LINK = /\[\[(corpus|loop|artifact):([^|\]]+)\|([^\]]+)\]\]/g;

function renderMessageContent(
  content: string,
  onLandInCorpus?: (gangId: string, corpusId: string) => void,
  onOpenLoop?: (loopId: string) => void,
): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_LINK.lastIndex = 0;
  let key = 0;
  while ((match = INLINE_LINK.exec(content)) !== null) {
    if (match.index > lastIndex) out.push(content.slice(lastIndex, match.index));
    const [, kind, idPath, display] = match;
    if (kind === "corpus") {
      const [gangId, corpusId] = idPath.split("/");
      out.push(
        <button
          key={`ref-${key++}`}
          type="button"
          onClick={() => onLandInCorpus?.(gangId, corpusId)}
          className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {display}
        </button>,
      );
    } else if (kind === "loop") {
      out.push(
        <button
          key={`ref-${key++}`}
          type="button"
          onClick={() => onOpenLoop?.(idPath)}
          className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {display}
        </button>,
      );
    } else {
      // artifact: muted non-interactive provenance. User does not browse
      // artifacts directly per c698e710.
      out.push(
        <span key={`ref-${key++}`} className="text-muted-foreground">
          {display}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) out.push(content.slice(lastIndex));
  return out;
}

function ColdOpenMessage({
  message,
  onLandInCorpus,
  onOpenLoop,
}: {
  message: Message;
  onLandInCorpus: (gangId: string, corpusId: string) => void;
  onOpenLoop: (loopId: string) => void;
}) {
  // Left-bordered card on secondary background, visually distinct from a normal
  // assistant reply (spec Phase 2). Renders the cold-open content with inline
  // link parsing.
  return (
    <div className="border-l-2 border-primary bg-secondary/40 rounded-r px-4 py-3 text-sm whitespace-pre-wrap">
      {renderMessageContent(message.content, onLandInCorpus, onOpenLoop)}
    </div>
  );
}

function ContinuedInMarker({ onJump }: { targetTabId: string; onJump: () => void }) {
  return (
    <div className="text-xs text-muted-foreground italic pl-11">
      → continued in{" "}
      <button type="button" onClick={onJump} className="underline decoration-dotted hover:decoration-solid">
        new session
      </button>
    </div>
  );
}

function MessageComponent({
  message,
  onLandInCorpus,
  onOpenLoop,
  onResolveQA,
  onRetry,
}: {
  message: Message;
  onLandInCorpus: (gangId: string, corpusId: string) => void;
  onOpenLoop: (loopId: string) => void;
  onResolveQA: (resolution: QABlockResolution) => void;
  onRetry: () => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? "bg-primary text-primary-foreground"
              : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-secondary text-secondary-foreground"
          }
        >
          {isUser ? "U" : isSystem ? "S" : "A"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 min-w-0">
        {message.content && (
          <div className="text-sm whitespace-pre-wrap">
            {renderMessageContent(message.content, onLandInCorpus, onOpenLoop)}
          </div>
        )}
        {message.toolUse && message.toolUse.length > 0 && (
          <div className="space-y-1">
            {message.toolUse.map((tool) => (
              <ToolUseBlock key={tool.id} tool={tool} />
            ))}
          </div>
        )}
        {message.qaBlock && (
          <QABlock
            spec={message.qaBlock}
            resolution={message.qaResolution}
            onResolve={onResolveQA}
          />
        )}
        {message.isError && <ErrorFooter onRetry={onRetry} />}
      </div>
    </div>
  );
}

// ToolUseBlock (spec Phase 6): inline, small left rule, monospace label,
// persists after completion. Replaces Make's Collapsible variant which did not
// match the locked claude-style inline tool-use rendering.
function ToolUseBlock({ tool }: { tool: ToolUse }) {
  return (
    <div className="border-l-2 border-primary/40 pl-3 py-0.5 text-xs font-mono text-muted-foreground flex items-center gap-2">
      <span className="truncate">{tool.name}</span>
      {tool.status === "running" && <span className="animate-pulse" aria-hidden>•</span>}
      {tool.status === "error" && <span className="text-destructive">!</span>}
    </div>
  );
}

function ErrorFooter({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 text-xs text-destructive">
      <span>Something went wrong mid-response.</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 underline decoration-dotted hover:decoration-solid"
      >
        <RotateCcw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

function StopButton({ onStop }: { onStop: () => void }) {
  return (
    <Button onClick={onStop} size="icon" variant="outline" aria-label="Stop">
      <Square className="h-3.5 w-3.5 fill-current" />
    </Button>
  );
}

// QABlock (spec Phase 7): inline structured Q&A primitive. Renders unresolved
// block as radio/checkbox + optional Other + Skip/Stop. Composer is hard-paused
// elsewhere while any QABlock in the tab is unresolved. After resolution the
// block collapses into a recorded-choice line.
function QABlock({
  spec,
  resolution,
  onResolve,
}: {
  spec: import("../types").QABlockSpec;
  resolution: QABlockResolution | undefined;
  onResolve: (r: QABlockResolution) => void;
}) {
  const [selectedSingle, setSelectedSingle] = useState<string>("");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [otherChecked, setOtherChecked] = useState(false);

  if (resolution) {
    const summary =
      resolution.kind === "stop"
        ? "stopped"
        : resolution.kind === "skip"
        ? "skipped (corpus picks default)"
        : resolution.kind === "other"
        ? `other: ${resolution.otherText ?? ""}`
        : (resolution.choices ?? []).join(", ");
    return (
      <div className="border border-border rounded px-3 py-2 text-xs text-muted-foreground bg-muted/30">
        <span className="font-medium">{spec.prompt}</span> · <span>{summary}</span>
      </div>
    );
  }

  const submitChoice = () => {
    if (otherChecked && spec.allowOther && otherText.trim()) {
      onResolve({ kind: "other", otherText: otherText.trim() });
      return;
    }
    if (spec.options.type === "single" && selectedSingle) {
      onResolve({ kind: "choice", choices: [selectedSingle] });
      return;
    }
    if (spec.options.type === "multi" && selectedMulti.length > 0) {
      onResolve({ kind: "choice", choices: selectedMulti });
    }
  };

  const submitDisabled =
    !(otherChecked && spec.allowOther && otherText.trim()) &&
    !(spec.options.type === "single" && selectedSingle) &&
    !(spec.options.type === "multi" && selectedMulti.length > 0);

  return (
    <div className="border border-border rounded px-4 py-3 bg-muted/30 space-y-3">
      <div className="text-sm font-medium">{spec.prompt}</div>
      {spec.options.type === "single" ? (
        <RadioGroup value={selectedSingle} onValueChange={(v) => { setSelectedSingle(v); setOtherChecked(false); }} className="space-y-2">
          {spec.options.choices.map((choice) => (
            <div key={choice} className="flex items-center gap-2">
              <RadioGroupItem value={choice} id={`${spec.id}-${choice}`} />
              <Label htmlFor={`${spec.id}-${choice}`} className="text-sm font-normal cursor-pointer">
                {choice}
              </Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <div className="space-y-2">
          {spec.options.choices.map((choice) => {
            const checked = selectedMulti.includes(choice);
            return (
              <div key={choice} className="flex items-center gap-2">
                <Checkbox
                  id={`${spec.id}-${choice}`}
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) setSelectedMulti((prev) => [...prev, choice]);
                    else setSelectedMulti((prev) => prev.filter((x) => x !== choice));
                  }}
                />
                <Label htmlFor={`${spec.id}-${choice}`} className="text-sm font-normal cursor-pointer">
                  {choice}
                </Label>
              </div>
            );
          })}
        </div>
      )}
      {spec.allowOther && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${spec.id}-other`}
            checked={otherChecked}
            onCheckedChange={(c) => {
              const next = Boolean(c);
              setOtherChecked(next);
              if (next) {
                setSelectedSingle("");
                setSelectedMulti([]);
              }
            }}
          />
          <Label htmlFor={`${spec.id}-other`} className="text-sm font-normal cursor-pointer shrink-0">
            Other:
          </Label>
          <Input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onFocus={() => setOtherChecked(true)}
            placeholder="type a custom answer"
            className="h-8 text-sm"
          />
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={submitChoice} disabled={submitDisabled}>
          Submit
        </Button>
        {spec.allowSkip && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onResolve({ kind: "skip" })}
            title="You decide — corpus picks default and continues"
          >
            Skip
          </Button>
        )}
        {spec.allowStop && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onResolve({ kind: "stop" })}
            className="text-destructive hover:text-destructive"
            title="Abandon the whole response"
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
