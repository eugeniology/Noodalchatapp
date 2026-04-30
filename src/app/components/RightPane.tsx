import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import type { ChatHistoryEntry, Loop, QuickAsk } from "../types";

interface RightPaneProps {
  status: string;
  chatHistory: ChatHistoryEntry[];
  loops: Loop[];
  quickAsks: QuickAsk[];
  onQuickAskClick: (ask: QuickAsk) => void;
  onHistoryClick?: (entry: ChatHistoryEntry) => void;
  onLoopClick?: (loop: Loop) => void;
  onRefreshStatus?: () => void;
}

export function RightPane({
  status,
  chatHistory,
  loops,
  quickAsks,
  onQuickAskClick,
  onHistoryClick,
  onLoopClick,
  onRefreshStatus,
}: RightPaneProps) {
  const [sectionsOpen, setSectionsOpen] = useState({
    history: true,
    loops: true,
    quickAsks: true,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-80">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Status Section (unlabeled, always visible) */}
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-muted-foreground space-y-1 flex-1">
              {status.split("\n").map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            {onRefreshStatus && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 -mt-0.5"
                onClick={onRefreshStatus}
                aria-label="Metabolize / refresh status"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Separator />

          {/* Chat History */}
          <Collapsible
            open={sectionsOpen.history}
            onOpenChange={() => toggleSection("history")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <h3 className="font-medium">Chat history</h3>
                {sectionsOpen.history ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {chatHistory.map((entry) => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onHistoryClick?.(entry)}
                  className="w-full justify-start h-auto py-2 px-2 flex-col items-start"
                >
                  <div className="text-xs font-normal truncate w-full text-left">
                    {entry.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Loops */}
          <Collapsible
            open={sectionsOpen.loops}
            onOpenChange={() => toggleSection("loops")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <h3 className="font-medium">Loops</h3>
                {sectionsOpen.loops ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {loops.map((loop) => (
                <button
                  key={loop.id}
                  onClick={() => onLoopClick?.(loop)}
                  className="w-full flex items-center justify-between text-sm hover:bg-muted/40 rounded px-2 py-1 -mx-2 text-left"
                >
                  <span className="truncate">{loop.name}</span>
                  <Badge
                    variant={loop.status === "CLOSED" ? "secondary" : "outline"}
                    className="text-xs ml-2 shrink-0"
                  >
                    {loop.status}
                  </Badge>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Quick Asks */}
          <Collapsible
            open={sectionsOpen.quickAsks}
            onOpenChange={() => toggleSection("quickAsks")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between p-0 h-auto hover:bg-transparent"
              >
                <h3 className="font-medium">Quick Asks</h3>
                {sectionsOpen.quickAsks ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 flex flex-wrap gap-2">
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
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
