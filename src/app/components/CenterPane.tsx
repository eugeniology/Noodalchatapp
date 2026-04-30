import { useState } from "react";
import { X, Paperclip, Send, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import type { ChatTab, Message } from "../types";

interface CenterPaneProps {
  corpusName: string | null;
  tabs: ChatTab[];
  activeTabId: string | null;
  onTabClose: (tabId: string) => void;
  onTabSelect: (tabId: string) => void;
  onSendMessage: (tabId: string, content: string) => void;
  onNewChat: () => void;
}

export function CenterPane({
  corpusName,
  tabs,
  activeTabId,
  onTabClose,
  onTabSelect,
  onSendMessage,
  onNewChat,
}: CenterPaneProps) {
  const [input, setInput] = useState("");

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleSend = () => {
    if (input.trim() && activeTab) {
      onSendMessage(activeTab.id, input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!corpusName) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a corpus from the left rail to start
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background h-10 flex items-center justify-center px-4">
        <span className="text-sm font-medium">{corpusName}</span>
      </div>

      <div className="border-b border-border bg-background flex items-center px-2 gap-1 min-h-10">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer border-b-2 ${
                tab.id === activeTabId
                  ? "border-primary bg-muted/50"
                  : "border-transparent hover:bg-muted/30"
              }`}
              onClick={() => onTabSelect(tab.id)}
            >
              <span className="text-sm">Chat {index + 1}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onNewChat}
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {activeTab ? (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
              {activeTab.messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 bg-background">
            <div className="max-w-4xl mx-auto w-full space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    className="min-h-[60px] pr-10 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSend} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Cmd+Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No open chats — click <Plus className="inline h-3.5 w-3.5 mx-1" /> to start one with {corpusName}
        </div>
      )}
    </div>
  );
}

function MessageComponent({ message }: { message: Message }) {
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
      <div className="flex-1 space-y-2">
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {message.toolUse && message.toolUse.length > 0 && (
          <div className="space-y-2">
            {message.toolUse.map((tool) => (
              <ToolUseBlock key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolUseBlock({ tool }: { tool: { id: string; name: string; status: string; result?: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between font-mono text-xs"
        >
          <span>
            {tool.name} {tool.status === "running" && "..."}
          </span>
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap">
          {tool.result || "Running..."}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
