import { useState } from "react";
import { ChevronLeft, FileText, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import type { Gang, Corpus } from "../types";

interface LeftRailProps {
  gangs: Gang[];
  orientedGang: Gang | null;
  onGangSelect: (gang: Gang) => void;
  onGangBack: () => void;
  onCorpusSelect: (corpus: Corpus) => void;
  onScratchPadOpen: () => void;
  selectedCorpusId?: string;
}

export function LeftRail({
  gangs,
  orientedGang,
  onGangSelect,
  onGangBack,
  onCorpusSelect,
  onScratchPadOpen,
  selectedCorpusId,
}: LeftRailProps) {
  const [filter, setFilter] = useState("");

  const handleScopeChange = () => {
    setFilter("");
  };

  const filteredGangs = gangs.filter((gang) =>
    gang.name.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredCorpora = orientedGang
    ? orientedGang.corpora.filter((corpus) =>
        corpus.name.toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-3 space-y-3">
        {orientedGang && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onGangBack();
              handleScopeChange();
            }}
            className="w-full justify-start gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {orientedGang.name}
          </Button>
        )}
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
          {!orientedGang
            ? filteredGangs.map((gang) => (
                <Button
                  key={gang.id}
                  variant="ghost"
                  onClick={() => {
                    onGangSelect(gang);
                    handleScopeChange();
                  }}
                  className="w-full justify-start h-9"
                >
                  {gang.name}
                </Button>
              ))
            : filteredCorpora.map((corpus) => (
                <Button
                  key={corpus.id}
                  variant="ghost"
                  onClick={() => onCorpusSelect(corpus)}
                  className={`w-full justify-start h-9 gap-2 ${
                    selectedCorpusId === corpus.id ? "bg-sidebar-accent" : ""
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      corpus.status === "green" ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  />
                  <span className="truncate">{corpus.name}</span>
                </Button>
              ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={onScratchPadOpen}
          className="w-full justify-start gap-2"
        >
          <FileText className="h-4 w-4" />
          Scratch pad
        </Button>
      </div>
    </div>
  );
}
