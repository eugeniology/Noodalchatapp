import { useState } from "react";
import {
  ChevronLeft,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Corpus, CorpusStatus, Gang } from "../types";

interface LeftRailProps {
  gangs: Gang[];
  orientedGang: Gang | null;
  onGangSelect: (gang: Gang) => void;
  onGangBack: () => void;
  onCorpusSelect: (corpus: Corpus) => void;
  onScratchPadOpen: () => void;
  selectedCorpusId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function statusDotClass(status: CorpusStatus | undefined): string {
  return status === "yellow" ? "bg-yellow-500" : "bg-green-500";
}

export function LeftRail(props: LeftRailProps) {
  const [filter, setFilter] = useState("");
  const handleScopeChange = () => setFilter("");

  const filteredGangs = props.gangs.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const filteredCorpora = props.orientedGang
    ? props.orientedGang.corpora.filter((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  if (props.isCollapsed) {
    return (
      <CollapsedRail
        {...props}
        filter={filter}
        onFilterChange={setFilter}
        filteredGangs={filteredGangs}
        filteredCorpora={filteredCorpora}
        onGangSelectInternal={(g) => {
          props.onGangSelect(g);
          handleScopeChange();
        }}
        onGangBackInternal={() => {
          props.onGangBack();
          handleScopeChange();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-1">
          {props.orientedGang ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                props.onGangBack();
                handleScopeChange();
              }}
              className="flex-1 justify-start gap-2 min-w-0"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{props.orientedGang.name}</span>
            </Button>
          ) : (
            <div className="flex-1" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={props.onToggleCollapse}
            aria-label="Collapse rail"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-2">
          {!props.orientedGang
            ? filteredGangs.map((gang) => (
                <Button
                  key={gang.id}
                  variant="ghost"
                  onClick={() => {
                    props.onGangSelect(gang);
                    handleScopeChange();
                  }}
                  className="w-full justify-start h-9 gap-2"
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${statusDotClass(gang.status)}`}
                  />
                  <span className="truncate">{gang.name}</span>
                </Button>
              ))
            : filteredCorpora.map((corpus) => (
                <Button
                  key={corpus.id}
                  variant="ghost"
                  onClick={() => props.onCorpusSelect(corpus)}
                  className={`w-full justify-start h-9 gap-2 border-l-2 ${
                    props.selectedCorpusId === corpus.id
                      ? "bg-sidebar-accent border-l-primary"
                      : "border-l-transparent"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${statusDotClass(corpus.status)}`}
                  />
                  <span className="truncate">{corpus.name}</span>
                </Button>
              ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={props.onScratchPadOpen}
          className="w-full justify-start gap-2"
        >
          <FileText className="h-4 w-4" />
          Scratch pad
        </Button>
      </div>
    </div>
  );
}

interface CollapsedRailProps extends LeftRailProps {
  filter: string;
  onFilterChange: (value: string) => void;
  filteredGangs: Gang[];
  filteredCorpora: Corpus[];
  onGangSelectInternal: (gang: Gang) => void;
  onGangBackInternal: () => void;
}

function CollapsedRail(props: CollapsedRailProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border items-center py-2 gap-1">
        {props.orientedGang && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={props.onGangBackInternal}
                aria-label="Back to community"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Back to community</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={props.onToggleCollapse}
              aria-label="Expand rail"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand rail</TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Filter"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Filter</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-56 p-2">
            <Input
              autoFocus
              placeholder="Filter..."
              value={props.filter}
              onChange={(e) => props.onFilterChange(e.target.value)}
            />
          </PopoverContent>
        </Popover>

        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-1 py-1">
            {!props.orientedGang
              ? props.filteredGangs.map((gang) => (
                  <Tooltip key={gang.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => props.onGangSelectInternal(gang)}
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
                        aria-label={gang.name}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${statusDotClass(gang.status)}`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{gang.name}</TooltipContent>
                  </Tooltip>
                ))
              : props.filteredCorpora.map((corpus) => {
                  const selected = props.selectedCorpusId === corpus.id;
                  return (
                    <Tooltip key={corpus.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => props.onCorpusSelect(corpus)}
                          className={`h-8 w-8 flex items-center justify-center rounded border-l-2 ${
                            selected
                              ? "bg-sidebar-accent border-l-primary"
                              : "border-l-transparent hover:bg-accent"
                          }`}
                          aria-label={corpus.name}
                        >
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${statusDotClass(corpus.status)}`}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{corpus.name}</TooltipContent>
                    </Tooltip>
                  );
                })}
          </div>
        </ScrollArea>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={props.onScratchPadOpen}
              aria-label="Scratch pad"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Scratch pad</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
