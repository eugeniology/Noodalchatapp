import { useState, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
import { CenterPane } from "./components/CenterPane";
import { RightPane } from "./components/RightPane";
import { ScratchPad } from "./components/ScratchPad";
import type { Community, Gang, Corpus, ChatTab, Message, ChatHistoryEntry, Loop, QuickAsk } from "./types";

const seedCommunity: Community = {
  id: "sagacity",
  name: "Sagacity",
  gangs: [
    {
      id: "platform-team",
      name: "corpora platform team",
      corpora: [
        { id: "platform-curator", name: "platform-team-curator", status: "green" },
        { id: "sagacity-lead", name: "sagacity-lead", status: "green" },
        { id: "organic-loop", name: "organic-loop", status: "green" },
        { id: "sagacity-sre", name: "sagacity-sre", status: "yellow" },
        { id: "sagacity-pm", name: "sagacity-product-manager", status: "green" },
      ],
    },
    { id: "leadership", name: "corpora leadership", corpora: [] },
    { id: "marketing", name: "noodal-marketing", corpora: [] },
  ],
};

const seedChatHistory: ChatHistoryEntry[] = [
  { id: "h1", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), title: "Deployment strategy discussion" },
  { id: "h2", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), title: "Architecture review" },
  { id: "h3", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), title: "Sprint planning notes" },
];

const seedLoops: Loop[] = [
  { id: "l1", name: "Platform health monitoring", status: "OBSERVING" },
  { id: "l2", name: "Security audit sweep", status: "OBSERVING" },
  { id: "l3", name: "Documentation sync", status: "OBSERVING" },
  { id: "l4", name: "Q1 OKR tracking", status: "CLOSED" },
];

const seedQuickAsks: QuickAsk[] = [
  { id: "qa1", text: "self-summary" },
  { id: "qa2", text: "what's blocked" },
  { id: "qa3", text: "current priorities" },
  { id: "qa4", text: "recent decisions" },
  { id: "qa5", text: "open ADRs" },
];

function statusFor(name: string): string {
  return `${name} — imprint v12, 0 pending tasks, 15 deltas absorbed in last metabolism pass.`;
}

function welcomeMessageFor(corpusName: string, recentAsks: QuickAsk[]): Message {
  const askLines = recentAsks.slice(0, 3).map((q) => `• ${q.text}`).join("\n");
  return {
    id: `msg-welcome-${corpusName}-${Date.now()}`,
    role: "assistant",
    content: `${statusFor(corpusName)}\n\nMost asked of me lately:\n${askLines}`,
    timestamp: new Date(),
  };
}

function welcomeTabFor(corpus: Corpus, recentAsks: QuickAsk[]): ChatTab {
  return {
    id: `tab-${corpus.id}-welcome`,
    corpusId: corpus.id,
    corpusName: corpus.name,
    messages: [welcomeMessageFor(corpus.name, recentAsks)],
  };
}

function findCorpusById(community: Community, id: string): Corpus | null {
  for (const gang of community.gangs) {
    const corpus = gang.corpora.find((c) => c.id === id);
    if (corpus) return corpus;
  }
  return null;
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [community] = useState<Community>(seedCommunity);
  const [orientedGang, setOrientedGang] = useState<Gang | null>(seedCommunity.gangs[0]);

  const initialCorpus = seedCommunity.gangs[0].corpora.find((c) => c.id === "sagacity-lead")!;
  const initialWelcomeTab = welcomeTabFor(initialCorpus, seedQuickAsks);

  const [summonedCorpusId, setSummonedCorpusId] = useState<string>(initialCorpus.id);
  const [tabsByCorpus, setTabsByCorpus] = useState<Record<string, ChatTab[]>>({
    [initialCorpus.id]: [initialWelcomeTab],
  });
  const [activeTabByCorpus, setActiveTabByCorpus] = useState<Record<string, string | null>>({
    [initialCorpus.id]: initialWelcomeTab.id,
  });

  const [scratchPadOpen, setScratchPadOpen] = useState(false);
  const [overlay, setOverlay] = useState<{ title: string; body?: string } | null>(null);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  const summonedCorpus = findCorpusById(community, summonedCorpusId);
  const currentTabs = tabsByCorpus[summonedCorpusId] ?? [];
  const activeTabId = activeTabByCorpus[summonedCorpusId] ?? null;

  const handleCorpusSelect = (corpus: Corpus) => {
    setSummonedCorpusId(corpus.id);
    if (!tabsByCorpus[corpus.id]) {
      const welcomeTab = welcomeTabFor(corpus, seedQuickAsks);
      setTabsByCorpus((prev) => ({ ...prev, [corpus.id]: [welcomeTab] }));
      setActiveTabByCorpus((prev) => ({ ...prev, [corpus.id]: welcomeTab.id }));
    }
  };

  const handleNewChat = () => {
    if (!summonedCorpus) return;
    const newTab: ChatTab = {
      id: `tab-${summonedCorpus.id}-${Date.now()}`,
      corpusId: summonedCorpus.id,
      corpusName: summonedCorpus.name,
      messages: [],
    };
    setTabsByCorpus((prev) => ({
      ...prev,
      [summonedCorpus.id]: [...(prev[summonedCorpus.id] ?? []), newTab],
    }));
    setActiveTabByCorpus((prev) => ({ ...prev, [summonedCorpus.id]: newTab.id }));
  };

  const handleTabClose = (tabId: string) => {
    if (!summonedCorpus) return;
    const corpusId = summonedCorpus.id;
    const remaining = (tabsByCorpus[corpusId] ?? []).filter((t) => t.id !== tabId);
    setTabsByCorpus((prev) => ({ ...prev, [corpusId]: remaining }));
    if (activeTabByCorpus[corpusId] === tabId) {
      setActiveTabByCorpus((prev) => ({
        ...prev,
        [corpusId]: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
      }));
    }
  };

  const handleTabSelect = (tabId: string) => {
    if (!summonedCorpus) return;
    setActiveTabByCorpus((prev) => ({ ...prev, [summonedCorpus.id]: tabId }));
  };

  const handleSendMessage = (tabId: string, content: string) => {
    if (!summonedCorpus) return;
    const corpusId = summonedCorpus.id;
    setTabsByCorpus((prev) => ({
      ...prev,
      [corpusId]: (prev[corpusId] ?? []).map((tab) => {
        if (tab.id !== tabId) return tab;
        const userMsg: Message = {
          id: `msg-${Date.now()}-user`,
          role: "user",
          content,
          timestamp: new Date(),
        };
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}-assistant`,
          role: "assistant",
          content: "This is a simulated response from the noodal. In a real implementation, this would connect to the actual corpus backend.",
          timestamp: new Date(),
        };
        return { ...tab, messages: [...tab.messages, userMsg, assistantMsg] };
      }),
    }));
  };

  const handleQuickAskClick = (ask: QuickAsk) => {
    if (activeTabId) handleSendMessage(activeTabId, ask.text);
  };

  const handleHistoryClick = (entry: ChatHistoryEntry) => {
    if (!summonedCorpus) return;
    const corpusId = summonedCorpus.id;
    const restoredTab: ChatTab = {
      id: `tab-history-${entry.id}-${Date.now()}`,
      corpusId,
      corpusName: summonedCorpus.name,
      messages: [
        {
          id: `msg-history-${entry.id}-${Date.now()}`,
          role: "system",
          content: `Resumed: ${entry.title}\n\n(Placeholder — real restore would fetch the prior session from the membrane.)`,
          timestamp: entry.timestamp,
        },
      ],
    };
    setTabsByCorpus((prev) => ({
      ...prev,
      [corpusId]: [...(prev[corpusId] ?? []), restoredTab],
    }));
    setActiveTabByCorpus((prev) => ({ ...prev, [corpusId]: restoredTab.id }));
  };

  const handleLoopClick = (loop: Loop) => {
    setOverlay({
      title: `Loop · ${loop.name}`,
      body: `Status: ${loop.status}. Placeholder — eventual canonical loop landing is defined by deep-link loop cda97be2.`,
    });
  };

  const handleMenuItem = (item: string) => {
    setOverlay({
      title: item,
      body: "Placeholder. Real surface arrives with the relevant build loop.",
    });
  };

  const handleRefreshStatus = () => {
    setOverlay({
      title: "Metabolize",
      body: "Placeholder. Real metabolize would trigger a fresh imprint pass via the membrane MCP and update the status block in place.",
    });
  };

  return (
    <div className="size-full flex flex-col bg-background">
      <TopBar
        community={community}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onMenuItem={handleMenuItem}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
          <LeftRail
            gangs={community.gangs}
            orientedGang={orientedGang}
            onGangSelect={setOrientedGang}
            onGangBack={() => setOrientedGang(null)}
            onCorpusSelect={handleCorpusSelect}
            onScratchPadOpen={() => setScratchPadOpen(true)}
            selectedCorpusId={summonedCorpusId}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={57} minSize={40}>
          <CenterPane
            corpusName={summonedCorpus?.name ?? null}
            tabs={currentTabs}
            activeTabId={activeTabId}
            onTabClose={handleTabClose}
            onTabSelect={handleTabSelect}
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <RightPane
            status={summonedCorpus ? statusFor(summonedCorpus.name) : ""}
            chatHistory={seedChatHistory}
            loops={seedLoops}
            quickAsks={seedQuickAsks}
            onQuickAskClick={handleQuickAskClick}
            onHistoryClick={handleHistoryClick}
            onLoopClick={handleLoopClick}
            onRefreshStatus={handleRefreshStatus}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {scratchPadOpen && <ScratchPad onClose={() => setScratchPadOpen(false)} />}

      <Dialog open={!!overlay} onOpenChange={(open) => !open && setOverlay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{overlay?.title}</DialogTitle>
            {overlay?.body && <DialogDescription>{overlay.body}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverlay(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
