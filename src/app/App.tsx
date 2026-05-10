import { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
import { CenterPane } from "./components/CenterPane";
import { RightPane } from "./components/RightPane";
import { ScratchPad } from "./components/ScratchPad";
import type { Community, Gang, Corpus, ChatTab, Message, ChatHistoryEntry, Loop, QuickAsk } from "./types";

// Rail data is currently seeded in-memory. When this becomes a real fetch (with RBAC),
// the visibility-not-error rule from b8dcfb02 applies: filter rail data at fetch time
// based on the user's role/permissions, never on click. Inaccessible corpora simply do
// not appear; clicks never produce "you can't access this" errors.
const seedCommunity: Community = {
  id: "sagacity",
  name: "Sagacity",
  gangs: [
    {
      id: "platform-team",
      name: "corpora platform team",
      status: "yellow",
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
      status: "green",
      corpora: [],
    },
    {
      id: "marketing",
      name: "noodal-marketing",
      status: "green",
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

function statusFor(name: string): string {
  return `${name} — imprint v12, 0 pending tasks, 15 deltas absorbed in last metabolism pass.`;
}

function welcomeMessageFor(corpusName: string): Message {
  const askLines = seedQuickAsks.slice(0, 3).map((q) => `• ${q.text}`).join("\n");
  // Inline corpus link demo: see CenterPane MessageComponent for the [[corpus:...]] parser.
  return {
    id: `msg-welcome-${corpusName}-${Date.now()}`,
    role: "assistant",
    content: `${statusFor(corpusName)}\n\nMost asked of me lately:\n${askLines}\n\nRelated: [[corpus:platform-team/sagacity-lead|sagacity-lead]] · [[corpus:platform-team/organic-loop|organic-loop]]`,
    timestamp: new Date(),
  };
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [community] = useState<Community>(seedCommunity);
  // Cold open at community level (c96e3b5d): no gang oriented, no tabs.
  const [orientedGang, setOrientedGang] = useState<Gang | null>(null);
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [scratchPadOpen, setScratchPadOpen] = useState(false);

  // Left-rail collapse state is per-session (no persistence) per c96e3b5d.
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const handleToggleLeftRail = () => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const handleGangSelect = (gang: Gang) => setOrientedGang(gang);
  const handleGangBack = () => setOrientedGang(null);

  const handleCorpusSelect = (corpus: Corpus) => {
    const existingTab = tabs.find((tab) => tab.corpusId === corpus.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }
    const newTab: ChatTab = {
      id: `tab-${corpus.id}`,
      corpusId: corpus.id,
      corpusName: corpus.name,
      messages: [welcomeMessageFor(corpus.name)],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // Canonical landing path for inline corpus link clicks AND future deep-links
  // (per b8dcfb02 § "Deep-link unification"). URL parsing is owned by sagacity-lead
  // loop cda97be2 — that work plugs into this single integration point.
  //
  // Behavior: orient the rail on the gang, ALWAYS open a fresh center tab (vs.
  // handleCorpusSelect which reuses an existing tab), and dispatch a
  // `noodal:cold-open` window event the chat surface can subscribe to. Event
  // dispatch chosen as a window CustomEvent for cross-tree decoupling without
  // a context provider.
  const landInCorpus = (gangId: string, corpusId: string) => {
    const gang = community.gangs.find((g) => g.id === gangId);
    if (!gang) return;
    const corpus = gang.corpora.find((c) => c.id === corpusId);
    if (!corpus) return;
    setOrientedGang(gang);
    const newTab: ChatTab = {
      id: `tab-${corpus.id}-${Date.now()}`,
      corpusId: corpus.id,
      corpusName: corpus.name,
      messages: [welcomeMessageFor(corpus.name)],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    window.dispatchEvent(
      new CustomEvent("noodal:cold-open", {
        detail: { type: "cold-open", corpusId, gangId },
      }),
    );
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

  const handleTabSelect = (tabId: string) => setActiveTabId(tabId);

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
    if (activeTabId) handleSendMessage(activeTabId, ask.text);
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const selectedCorpusId = activeTab?.corpusId;
  const status = activeTab ? statusFor(activeTab.corpusName) : "";

  return (
    <div className="size-full flex flex-col bg-background">
      <TopBar community={community} isDark={isDark} onToggleTheme={toggleTheme} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={18}
          minSize={15}
          maxSize={30}
          collapsible
          collapsedSize={4}
          onCollapse={() => setLeftRailCollapsed(true)}
          onExpand={() => setLeftRailCollapsed(false)}
        >
          <LeftRail
            gangs={community.gangs}
            orientedGang={orientedGang}
            onGangSelect={handleGangSelect}
            onGangBack={handleGangBack}
            onCorpusSelect={handleCorpusSelect}
            onScratchPadOpen={() => setScratchPadOpen(true)}
            selectedCorpusId={selectedCorpusId}
            isCollapsed={leftRailCollapsed}
            onToggleCollapse={handleToggleLeftRail}
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
            onLandInCorpus={landInCorpus}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <RightPane
            status={status}
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
