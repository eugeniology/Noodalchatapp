import type { ReactNode } from "react";
import { useState } from "react";
import { RotateCcw, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import type { Message, QABlockResolution, QABlockSpec, ToolUse } from "../types";

// Slice-3 chat-surface primitives, extracted from CenterPane.tsx so the
// scratch pad (slice 6) and any future chat surface can reuse them without
// duplicating rendering logic. Behavior is identical to the inline slice-3
// implementation; this is a pure refactor, not a redesign.

// Inline link syntax (cross-cutting decision 2e32b6b7):
//   [[corpus:gangId/corpusId|Display]]  → dotted-underline button, calls onLandInCorpus
//   [[loop:loopId|Display]]             → dotted-underline button, calls onOpenLoop (stub)
//   [[artifact:artifactId|Display]]     → muted span, non-interactive (provenance only)
export const INLINE_LINK = /\[\[(corpus|loop|artifact):([^|\]]+)\|([^\]]+)\]\]/g;

export function renderMessageContent(
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
      // artifact: muted non-interactive provenance.
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

// ToolUseBlock: inline, small left rule, monospace label, persists after
// completion. Designed for inline tool-use display within an assistant message.
export function ToolUseBlock({ tool }: { tool: ToolUse }) {
  return (
    <div className="border-l-2 border-primary/40 pl-3 py-0.5 text-xs font-mono text-muted-foreground flex items-center gap-2">
      <span className="truncate">{tool.name}</span>
      {tool.status === "running" && <span className="animate-pulse" aria-hidden>•</span>}
      {tool.status === "error" && <span className="text-destructive">!</span>}
    </div>
  );
}

export function ErrorFooter({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-destructive">
      <span>{message ?? "Something went wrong mid-response."}</span>
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

export function StopButton({ onStop }: { onStop: () => void }) {
  return (
    <Button onClick={onStop} size="icon" variant="outline" aria-label="Stop">
      <Square className="h-3.5 w-3.5 fill-current" />
    </Button>
  );
}

// QABlock: inline structured Q&A primitive. Used by corpus chats; scratch pad
// doesn't fire QA blocks but MessageComponent's union branch keeps the
// primitive contract stable.
export function QABlock({
  spec,
  resolution,
  onResolve,
}: {
  spec: QABlockSpec;
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

// MessageComponent: full message renderer with avatar, inline-link-parsed
// content, tool-use blocks, qa-block, and error-footer. Used by both
// CenterPane (corpus chats) and ScratchPad (LLM passthrough).
export function MessageComponent({
  message,
  onLandInCorpus,
  onOpenLoop,
  onResolveQA,
  onRetry,
}: {
  message: Message;
  onLandInCorpus?: (gangId: string, corpusId: string) => void;
  onOpenLoop?: (loopId: string) => void;
  onResolveQA?: (resolution: QABlockResolution) => void;
  onRetry?: () => void;
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
        {message.qaBlock && onResolveQA && (
          <QABlock
            spec={message.qaBlock}
            resolution={message.qaResolution}
            onResolve={onResolveQA}
          />
        )}
        {message.isError && onRetry && <ErrorFooter onRetry={onRetry} />}
      </div>
    </div>
  );
}
