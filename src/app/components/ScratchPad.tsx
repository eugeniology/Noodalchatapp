import { useEffect, useMemo, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { X, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ErrorFooter, MessageComponent, StopButton } from "./chat-primitives";
import type { Message, ToolUse } from "../types";

// Slice 6 — LLM passthrough scratch pad.
// Honors locked decision d1678106 verbatim:
//   • session-only (no localStorage; key in React state only)
//   • BYOM (user-supplied Anthropic API key)
//   • web search always on (native web_search_20260209)
// Path 1 (browser-direct Claude) per founder direction 2026-05-10. Multi-
// provider BYOM and noodal-api passthrough are deferred to future slices.

type ModelId = "claude-opus-4-7" | "claude-sonnet-4-6" | "claude-haiku-4-5";

const MODEL_LABELS: Record<ModelId, string> = {
  "claude-opus-4-7": "Opus 4.7",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

const SYSTEM_PROMPT =
  "You are Claude, the LLM running this Noodals scratch pad. Web search is always available — use it when the user asks about anything that may have changed since your training cutoff, or when fresh sources would meaningfully improve your answer. Be helpful and direct.";

// Per-model config table per claude-api skill guidance:
//   Opus 4.7  → adaptive thinking + effort:high  + max_tokens 64K
//   Sonnet 4.6 → adaptive thinking + effort:medium + max_tokens 32K
//   Haiku 4.5  → NO thinking + NO effort (both 400 on Haiku) + max_tokens 16K
function modelConfigFor(model: ModelId): Record<string, unknown> {
  if (model === "claude-opus-4-7") {
    return {
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
    };
  }
  if (model === "claude-sonnet-4-6") {
    return {
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
    };
  }
  return { max_tokens: 16000 };
}

interface ScratchPadProps {
  onClose: () => void;
}

export function ScratchPad({ onClose }: ScratchPadProps) {
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [model, setModel] = useState<ModelId>("claude-opus-4-7");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  // Esc-to-close was punted from slice 1; lands here.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Client is recreated whenever apiKey changes; never persisted anywhere.
  const client = useMemo(
    () =>
      apiKey ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) : null,
    [apiKey],
  );

  const handleConnect = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setKeyInput("");
    setError(null);
  };

  const handleStop = () => {
    streamControllerRef.current?.abort();
    streamControllerRef.current = null;
  };

  const handleSend = async () => {
    if (!input.trim() || !client || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    const assistantId = `msg-${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      toolUse: [],
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);
    setError(null);

    // v1 sends text-only history. Tool-use context within a single turn works
    // because the model has it in the stream; cross-turn tool-use context
    // preservation is deferred (would require sending the full content-block
    // array back, not just the text).
    const history = [...messages, userMessage]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
      const stream = client.messages.stream({
        model,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [{ type: "web_search_20260209", name: "web_search" }],
        ...modelConfigFor(model),
        messages: history,
      } as Parameters<typeof client.messages.stream>[0]);
      streamControllerRef.current = stream.controller;

      // Track tool-use blocks by stream index so we can mark them complete on
      // content_block_stop. Web search arrives as server_tool_use blocks.
      const toolsByIndex = new Map<number, string>();

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "server_tool_use") {
            const tool: ToolUse = {
              id: block.id,
              name: block.name === "web_search" ? "web_search…" : `${block.name}…`,
              status: "running",
            };
            toolsByIndex.set(event.index, block.id);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolUse: [...(m.toolUse ?? []), tool] }
                  : m,
              ),
            );
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            const text = event.delta.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + text } : m,
              ),
            );
          }
        } else if (event.type === "content_block_stop") {
          const toolId = toolsByIndex.get(event.index);
          if (toolId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolUse: (m.toolUse ?? []).map((t) =>
                        t.id === toolId
                          ? { ...t, status: "complete", name: t.name.replace(/…$/, "") }
                          : t,
                      ),
                    }
                  : m,
              ),
            );
          }
        }
      }

      const final = await stream.finalMessage();
      // pause_turn: web search hit its iteration cap. Auto-continue per skill:
      // re-send with the assistant turn appended; do NOT add a "continue"
      // user message — the server resumes automatically.
      if (final.stop_reason === "pause_turn") {
        // For v1 we surface this as a notice rather than auto-loop; the user
        // can send "continue" themselves. Auto-resume can layer in later.
        setError(
          "Search paused (iteration cap). Send another message to continue.",
        );
      }
    } catch (e) {
      // Typed exceptions per claude-api skill — never string-match.
      if (e instanceof Anthropic.AuthenticationError) {
        setApiKey("");
        setError("That key was rejected. Please re-enter.");
      } else if (e instanceof Anthropic.RateLimitError) {
        setError("Rate limited. Please retry shortly.");
      } else if (e instanceof Anthropic.APIConnectionError) {
        setError("Connection error. Check your network and retry.");
      } else if (e instanceof Anthropic.APIError) {
        setError(e.message || "API error.");
      } else if ((e as Error)?.name === "AbortError") {
        // User-initiated stop — not an error, partial response remains.
      } else {
        setError((e as Error)?.message || "Unknown error.");
      }
      // Mark the in-flight assistant message as errored (unless aborted).
      if ((e as Error)?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isError: true } : m)),
        );
      }
    } finally {
      setIsStreaming(false);
      streamControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-medium">Scratch pad</h2>
          {apiKey && (
            <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-opus-4-7">
                  {MODEL_LABELS["claude-opus-4-7"]}
                </SelectItem>
                <SelectItem value="claude-sonnet-4-6">
                  {MODEL_LABELS["claude-sonnet-4-6"]}
                </SelectItem>
                <SelectItem value="claude-haiku-4-5">
                  {MODEL_LABELS["claude-haiku-4-5"]}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close scratch pad"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!apiKey ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full space-y-4">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-medium">Bring your own Anthropic key</h3>
              <p className="text-sm text-muted-foreground">
                Your key stays in browser memory only — never persisted, never
                sent anywhere except <code>api.anthropic.com</code> directly from
                this page. Closing the tab clears it. Session-only per locked
                decision <code>d1678106</code>.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
                placeholder="sk-ant-..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleConnect} disabled={!keyInput.trim()}>
                Connect
              </Button>
            </div>
            {error && (
              <div className="text-xs text-destructive text-center">{error}</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Web search is always on. Ask anything.
                </div>
              )}
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}
              {error && !isStreaming && (
                <ErrorFooter
                  message={error}
                  onRetry={() => setError(null)}
                />
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 bg-background shrink-0">
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isStreaming ? "streaming…" : "Message..."}
                    className="min-h-[60px] resize-none"
                    disabled={isStreaming}
                  />
                </div>
                {isStreaming ? (
                  <StopButton onStop={handleStop} />
                ) : (
                  <Button
                    onClick={handleSend}
                    size="icon"
                    disabled={!input.trim()}
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-center mt-2">
                Cmd+Enter to send · {MODEL_LABELS[model]} · web search on
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
