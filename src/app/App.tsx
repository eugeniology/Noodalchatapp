import { useState, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
import { CenterPane } from "./components/CenterPane";
import { RightPane } from "./components/RightPane";
import { ScratchPad } from "./components/ScratchPad";
import type { Community, Gang, Corpus, ChatTab, Message, ChatHistoryEntry, Loop, QuickAsk } from "./types";

// Seed data
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
    {
      id: "leadership",
      name: "corpora leadership",
      corpora: [],
    },
    {
      id: "marketing",
      name: "noodal-marketing",
      corpora: [],
    },
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

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [community] = useState<Community>(seedCommunity);
  const [orientedGang, setOrientedGang] = useState<Gang | null>(
    seedCommunity.gangs[0]
  );
  const [tabs, setTabs] = useState<ChatTab[]>([
    {
      id: "tab-sagacity-lead",
      corpusId: "sagacity-lead",
      corpusName: "sagacity-lead",
      messages: [
        {
          id: "m1",
          role: "system",
          content: "sagacity-lead — imprint v12, 0 pending tasks, 15 deltas absorbed in last metabolism pass.",
          timestamp: new Date(),
        },
      ],
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-sagacity-lead");
  const [scratchPadOpen, setScratchPadOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleGangSelect = (gang: Gang) => {
    setOrientedGang(gang);
  };

  const handleGangBack = () => {
    setOrientedGang(null);
  };

  const handleCorpusSelect = (corpus: Corpus) => {
    const existingTab = tabs.find((tab) => tab.corpusId === corpus.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTab: ChatTab = {
        id: `tab-${corpus.id}`,
        corpusId: corpus.id,
        corpusName: corpus.name,
        messages: [],
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleTabClose = (tabId: string) => {
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      setActiveTabId(null);
    }
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleSendMessage = (tabId: string, content: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === tabId) {
          const userMessage: Message = {
            id: `msg-${Date.now()}-user`,
            role: "user",
            content,
            timestamp: new Date(),
          };
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: "This is a simulated response from the noodal. In a real implementation, this would connect to the actual corpus backend.",
            timestamp: new Date(),
          };
          return {
            ...tab,
            messages: [...tab.messages, userMessage, assistantMessage],
          };
        }
        return tab;
      })
    );
  };

  const handleQuickAskClick = (ask: QuickAsk) => {
    if (activeTabId) {
      handleSendMessage(activeTabId, ask.text);
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const selectedCorpusId = activeTab?.corpusId;

  return (
    <div className="size-full flex flex-col bg-background">
      <TopBar community={community} isDark={isDark} onToggleTheme={toggleTheme} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
          <LeftRail
            gangs={community.gangs}
            orientedGang={orientedGang}
            onGangSelect={handleGangSelect}
            onGangBack={handleGangBack}
            onCorpusSelect={handleCorpusSelect}
            onScratchPadOpen={() => setScratchPadOpen(true)}
            selectedCorpusId={selectedCorpusId}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={57} minSize={40}>
          <CenterPane
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClose={handleTabClose}
            onTabSelect={handleTabSelect}
            onSendMessage={handleSendMessage}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <RightPane
            status="sagacity-lead — imprint v12, 0 pending tasks, 15 deltas absorbed in last metabolism pass."
            chatHistory={seedChatHistory}
            loops={seedLoops}
            quickAsks={seedQuickAsks}
            onQuickAskClick={handleQuickAskClick}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {scratchPadOpen && <ScratchPad onClose={() => setScratchPadOpen(false)} />}
    </div>
  );
}