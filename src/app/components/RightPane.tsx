import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { X, Activity, History, Repeat, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import type { ChatHistoryEntry, Loop, QuickAsk } from "../types";

interface RightPaneProps {
  status: string;
  chatHistory: ChatHistoryEntry[];
  loops: Loop[];
  quickAsks: QuickAsk[];
  onQuickAskClick: (ask: QuickAsk) => void;
  onHistoryClick?: (entry: ChatHistoryEntry) => void;
  // Driven by App's ResizablePanel collapse state. When true, the pane is at
  // collapsed-size width and the rail renders icon-strip-only. When false, the
  // pane is at normal width and the rail renders the section column + outer-
  // edge icon strip for individually-collapsed sections.
  panelCollapsed: boolean;
  // Callback to request panel collapse/expand. Called on (a) last section ×
  // → request collapse; (b) icon click in collapsed mode → request expand
  // (also restores the section locally so the user sees content on expand).
  onControlPanel: (action: "collapse" | "expand") => void;
}

type SectionId = "status" | "history" | "loops" | "quickAsks";

const SECTION_META: Record<SectionId, { icon: ComponentType<{ className?: string }>; label: string }> = {
  status: { icon: Activity, label: "Status" },
  history: { icon: History, label: "Chat history" },
  loops: { icon: Repeat, label: "Loops" },
  quickAsks: { icon: Sparkles, label: "Quick Asks" },
};

const SECTION_ORDER: SectionId[] = ["status", "history", "loops", "quickAsks"];

export function RightPane({
  status,
  chatHistory,
  loops,
  quickAsks,
  onQuickAskClick,
  onHistoryClick,
  panelCollapsed,
  onControlPanel,
}: RightPaneProps) {
  // Per-session only (no localStorage) per c96e3b5d. Each × close tucks the
  // section's icon into the outer-edge strip; click to restore.
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    status: false,
    history: false,
    loops: false,
    quickAsks: false,
  });

  const collapse = (id: SectionId) => setCollapsed((p) => ({ ...p, [id]: true }));
  const restore = (id: SectionId) => setCollapsed((p) => ({ ...p, [id]: false }));

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const hasCollapsed = SECTION_ORDER.some((id) => collapsed[id]);
  const allCollapsed = SECTION_ORDER.every((id) => collapsed[id]);

  // When the last open section is closed, request panel collapse. Don't
  // auto-expand on !allCollapsed — that path runs through icon-click + explicit
  // onControlPanel("expand"), which restores the section in the same gesture.
  useEffect(() => {
    if (allCollapsed && !panelCollapsed) onControlPanel("collapse");
  }, [allCollapsed, panelCollapsed, onControlPanel]);

  // Icon-strip-only mode: rendered when the ResizablePanel is at collapsed
  // width. Lists all four sections as icons (any of them can be the user's
  // entry point back into the pane). Clicking an icon restores that section
  // AND requests panel expand in the same gesture.
  if (panelCollapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="h-full w-full border-l border-border flex flex-col items-center py-2 gap-1 bg-background">
          {SECTION_ORDER.map((id) => {
            const Icon = SECTION_META[id].icon;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      restore(id);
                      onControlPanel("expand");
                    }}
                    aria-label={`Open ${SECTION_META[id].label}`}
                    className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">{SECTION_META[id].label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex h-full bg-background border-l border-border">
      <ScrollArea className="flex-1 min-w-0">
        {/* divide-y gives each adjacent open section a top border, so sections
            read as visually distinct units without needing per-section borders.
            First/last get no extra divider automatically. */}
        <div className="px-4 divide-y divide-border">
          {!collapsed.status && (
            <div className="py-4">
              <SectionHeader id="status" onClose={collapse} unlabeled>
                <div className="text-sm text-muted-foreground space-y-1 pt-1">
                  {status
                    ? status.split("\n").map((line, i) => <div key={i}>{line}</div>)
                    : <div className="italic">no active corpus</div>}
                </div>
              </SectionHeader>
            </div>
          )}

          {!collapsed.history && (
            <div className="py-4">
              <SectionHeader id="history" onClose={collapse}>
                <div className="mt-2 space-y-1">
                  {chatHistory.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">no sessions yet</div>
                  )}
                  {chatHistory.map((entry) => (
                    <Button
                      key={entry.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onHistoryClick?.(entry)}
                      className="w-full justify-start h-auto py-2 px-2 flex-col items-start"
                    >
                      <div className="text-xs font-normal truncate w-full text-left">{entry.title}</div>
                      <div className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</div>
                    </Button>
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {!collapsed.loops && (
            <div className="py-4">
              <SectionHeader id="loops" onClose={collapse}>
                <div className="mt-2 space-y-2">
                  {loops.map((loop) => (
                    <div key={loop.id} className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate">{loop.name}</span>
                      <Badge variant={loop.status === "CLOSED" ? "secondary" : "outline"} className="text-xs shrink-0">
                        {loop.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {!collapsed.quickAsks && (
            <div className="py-4">
              <SectionHeader id="quickAsks" onClose={collapse}>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAsks.map((ask) => (
                    <Badge
                      key={ask.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => onQuickAskClick(ask)}
                    >
                      {ask.text}
                    </Badge>
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Outer-edge icon strip. Only rendered when at least one section is
          collapsed (spec Phase 8). Icons restore the section in its original
          order — order is implicit because we render from SECTION_ORDER. */}
      {hasCollapsed && (
        <TooltipProvider delayDuration={200}>
          <div className="w-10 shrink-0 border-l border-border flex flex-col items-center py-2 gap-1">
            {SECTION_ORDER.filter((id) => collapsed[id]).map((id) => {
              const Icon = SECTION_META[id].icon;
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => restore(id)}
                      aria-label={`Restore ${SECTION_META[id].label}`}
                      className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{SECTION_META[id].label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

function SectionHeader({
  id,
  onClose,
  unlabeled = false,
  children,
}: {
  id: SectionId;
  onClose: (id: SectionId) => void;
  unlabeled?: boolean;
  children: React.ReactNode;
}) {
  // × moved to the left of the label so it stays reachable on narrow viewports
  // (right-side × got clipped when the pane was at minSize).
  return (
    <div>
      <div className="flex items-center gap-2 min-h-5">
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label={`Close ${SECTION_META[id].label}`}
          className="opacity-60 hover:opacity-100 rounded hover:bg-muted p-0.5 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
        {unlabeled ? <span className="flex-1" /> : <h3 className="font-medium text-sm flex-1 truncate">{SECTION_META[id].label}</h3>}
      </div>
      {children}
    </div>
  );
}
