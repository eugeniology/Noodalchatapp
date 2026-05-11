import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X, Paperclip, Send, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  MessageComponent,
  StopButton,
  renderMessageContent,
} from "./chat-primitives";
import { welcomeMessageFor } from "../App";
import type {
  ChatTab,
  Community,
  Corpus,
  Message,
  QABlockResolution,
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
  // Slice four: resolve the live Corpus + Gang objects so the corpus header
  // can render role badge + metadata. activeTab carries gangId/corpusId; the
  // full objects live on community.
  const activeCorpus: Corpus | null =
    (activeTab &&
      community.gangs
        .find((g) => g.id === activeTab.gangId)
        ?.corpora.find((c) => c.id === activeTab.corpusId)) ||
    null;
  const hasUnresolvedQA = useMemo(
    () => activeTab?.messages.some((m) => m.qaBlock && !m.qaResolution) ?? false,
    [activeTab],
  );
  const isStreaming = activeTab?.isStreaming ?? false;
  // Slice five: read-only access hard-disables the composer end-to-end. Real
  // RBAC values land via loop 11af7fc9; for now accessRole is set in seed data
  // (sagacity-sre as the demo). undefined === "full".
  const isReadOnly = activeCorpus?.accessRole === "read-only";
  const composerDisabled = isStreaming || hasUnresolvedQA || isReadOnly;

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
      // Slice four: welcomeMessageFor branches on corpus.role (navigator /
      // curator / standard) so the cold-open opener character reflects the
      // corpus's role rather than every cold-open reading identically.
      onColdOpenReady(gang.id, detail.tabId, welcomeMessageFor(corpus, gang));
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
          {activeCorpus && <CorpusHeader corpus={activeCorpus} />}
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
                  disabled={isReadOnly}
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
                    placeholder={
                      isReadOnly
                        ? "read-only access — view only"
                        : hasUnresolvedQA
                        ? "waiting on your answer"
                        : "Message..."
                    }
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
                {isReadOnly
                  ? "read-only access — view only"
                  : hasUnresolvedQA
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

// Inline link parser, ToolUseBlock, ErrorFooter, StopButton, QABlock, and
// MessageComponent live in ./chat-primitives now (slice 6 extraction). Both
// CenterPane and ScratchPad share them.

// Per-corpus header strip rendered above the message list when an active tab
// exists (spec Phase 5 / c96e3b5d). Shows corpus name + role badge (Navigator
// or Curator) + imprint metadata placeholder. Real imprint metadata fetch
// lands when the corpus model wires up; for now the placeholder mirrors the
// status string the cold-open opener uses.
function CorpusHeader({ corpus }: { corpus: Corpus }) {
  return (
    <div className="border-b border-border bg-background px-4 py-2 flex items-center gap-3">
      <span className="text-sm font-medium truncate">{corpus.name}</span>
      {corpus.role === "navigator" && (
        <Badge variant="default" className="text-xs">Navigator</Badge>
      )}
      {corpus.role === "curator" && (
        <Badge variant="secondary" className="text-xs">Curator</Badge>
      )}
      <span className="text-xs text-muted-foreground truncate ml-auto">
        imprint v12 · 0 pending · 15 deltas
      </span>
    </div>
  );
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

