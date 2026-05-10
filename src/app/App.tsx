import { useCallback, useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
import { CenterPane } from "./components/CenterPane";
import { RightPane } from "./components/RightPane";
import { ScratchPad } from "./components/ScratchPad";
import type {
  Community,
  Gang,
  Corpus,
  ChatTab,
  Message,
  ChatHistoryEntry,
  Loop,
  QuickAsk,
  QABlockSpec,
  QABlockResolution,
} from "./types";

// Rail data is currently seeded in-memory. When this becomes a real fetch (with RBAC),
// the visibility-not-error rule from b8dcfb02 applies: filter rail data at fetch time
// based on the user's role/permissions, never on click. Inaccessible corpora simply do
// not appear; clicks never produce "you can't access this" errors.
const seedCommunity: Community = {
  id: "sagacity",
  name: "Sagacity",
  gangs: [
    {
      id: "community-admin",
      name: "community-admin",
      status: "green",
      curatorCorpusId: "community-navigator",
      // Slice four: community-admin is the home of the community navigator.
      // c96e3b5d locks "Community level: community navigator (a corpus inside
      // community-admin gang)". Phase A model (e3922a4d): the navigator corpus
      // also serves as the gang's curator — one corpus, both hats, until
      // Phase B Navigator deploys.
      corpora: [
        { id: "community-navigator", name: "community-navigator", status: "green", role: "navigator" },
      ],
    },
    {
      id: "platform-team",
      name: "corpora platform team",
      status: "yellow",
      curatorCorpusId: "platform-curator",
      corpora: [
        { id: "platform-curator", name: "platform-team-curator", status: "green", role: "curator" },
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
      curatorCorpusId: "leadership-curator",
      corpora: [
        { id: "leadership-curator", name: "leadership-curator", status: "green", role: "curator" },
      ],
    },
    {
      id: "marketing",
      name: "noodal-marketing",
      status: "green",
      curatorCorpusId: "marketing-curator",
      corpora: [
        { id: "marketing-curator", name: "marketing-curator", status: "green", role: "curator" },
      ],
    },
  ],
};

const seedLoops: Loop[] = [
  { id: "l1", name: "Platform health monitoring", status: "OBSERVING" },
  { id: "l2", name: "Security audit sweep", status: "OBSERVING" },
  { id: "l3", name: "Documentation sync", status: "OBSERVING" },
  { id: "l4", name: "Q1 OKR tracking", status: "CLOSED" },
];

const seedQuickAsks: QuickAsk[] = [
  { id: "qa1", text: "self-summary" },
  { id: "qa2", text: "what's blocked" },
  { id: "qa3", text: "demo: tool use" },
  { id: "qa4", text: "demo: trigger q&a" },
  { id: "qa5", text: "demo: error response" },
];

function statusFor(name: string): string {
  return `${name} — imprint v12, 0 pending tasks, 15 deltas absorbed in last metabolism pass.`;
}

// Welcome / cold-open content (slice four: branched by corpus.role).
//
// Lives in ChatTab.coldOpen — populated by the CenterPane noodal:cold-open
// subscriber, not seeded into messages[]. The CenterPane renders it as a
// <ColdOpenMessage> above the message list. Character differs by role per
// e3922a4d (Navigator = engagement / orientation across community; Curator =
// administrator / producer of a gang; standard = no role assignment).
export function welcomeMessageFor(corpus: Corpus, gang: Gang): Message {
  const askLines = seedQuickAsks.slice(0, 3).map((q) => `• ${q.text}`).join("\n");
  let opener: string;
  if (corpus.role === "navigator") {
    opener =
      `${corpus.name} — I help you find your way across ${gang.name === "community-admin" ? "this community" : `the ${gang.name} gang`}.\n` +
      `Ask me what's active, who owns what, where a topic lives.\n\n` +
      `Most asked of me lately:\n${askLines}\n\n` +
      `Try: [[corpus:platform-team/platform-curator|platform team curator]] · [[corpus:platform-team/sagacity-lead|sagacity-lead]] · [[loop:ea89973c|slice-three loop]] · [[artifact:820310ef|slice-three spec]]`;
  } else if (corpus.role === "curator") {
    opener =
      `${statusFor(corpus.name)}\n\nI administer the ${gang.name} gang. Ask me about its corpora, its loops, what's blocked, recent decisions.\n\n` +
      `Most asked of me lately:\n${askLines}\n\n` +
      `Related: [[corpus:${gang.id}/${corpus.id}|${corpus.name}]]`;
  } else {
    opener =
      `${statusFor(corpus.name)}\n\nMost asked of me lately:\n${askLines}\n\n` +
      `Related: [[corpus:platform-team/sagacity-lead|sagacity-lead]] · [[corpus:platform-team/organic-loop|organic-loop]] · [[loop:ea89973c|slice-three loop]] · [[artifact:820310ef|spec]]`;
  }
  return {
    id: `cold-${corpus.id}-${Date.now()}`,
    role: "assistant",
    content: opener,
    timestamp: new Date(),
  };
}

function fallbackTitle(tab: ChatTab): string {
  if (tab.title) return tab.title;
  const firstUser = tab.messages.find((m) => m.role === "user");
  if (firstUser) {
    const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
    return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
  }
  return tab.corpusName;
}

function makeAssistantReply(content: string): Message {
  // Demo branches make the slice-three rendering primitives visible without a
  // real LLM. Real streaming + tool-use wire-up lands in slice six.
  if (content === "demo: trigger q&a") {
    return {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "I need a bit more direction before I continue:",
      qaBlock: {
        id: `qa-${Date.now()}`,
        prompt: "Which path should we take?",
        options: { type: "single", choices: ["Tighten the existing flow", "Spin off a new loop", "Hand to sagacity-lead"] },
        allowOther: true,
        allowSkip: true,
        allowStop: true,
      },
      timestamp: new Date(),
    };
  }
  if (content === "demo: error response") {
    return {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "Started processing this but hit a snag mid-stream.",
      isError: true,
      timestamp: new Date(),
    };
  }
  if (content === "demo: tool use") {
    return {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "Walking through this step by step.",
      toolUse: [
        { id: `tu-${Date.now()}-1`, name: "reading sales-q3.xlsx", status: "complete" },
        { id: `tu-${Date.now()}-2`, name: "extracting tables", status: "complete" },
        { id: `tu-${Date.now()}-3`, name: "writing artifact", status: "running" },
      ],
      timestamp: new Date(),
    };
  }
  return {
    id: `msg-${Date.now()}-assistant`,
    role: "assistant",
    content: "This is a simulated response. Slice six wires real streaming through to the corpus backend.",
    timestamp: new Date(),
  };
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [community] = useState<Community>(seedCommunity);
  // Slice four: cold-open boots into community-admin oriented with the
  // community-navigator tab open. Replaces the slice-two/three "no gang
  // oriented" cold-empty state. c96e3b5d locks "Community level: community
  // navigator (a corpus inside community-admin gang)" — community-admin IS
  // the navigator's home.
  const [orientedGang, setOrientedGang] = useState<Gang | null>(
    () => seedCommunity.gangs.find((g) => g.id === "community-admin") ?? null,
  );

  // Per-gang tab state (spec Phase 1). Switching gangs swaps the visible strip;
  // tabs in the originating gang persist for when the user navigates back.
  const [tabsByGang, setTabsByGang] = useState<Record<string, ChatTab[]>>({});
  const [activeTabIdByGang, setActiveTabIdByGang] = useState<Record<string, string | null>>({});
  // Auto-evict-oldest target. Evicted tabs drop into the gang's Chat history.
  const [chatHistoryByGang, setChatHistoryByGang] = useState<Record<string, ChatHistoryEntry[]>>({});
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
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // Slice four: on first mount, open the community-navigator tab in
  // community-admin so cold-open isn't an empty "Select a gang" screen.
  // Guarded by didBoot ref to survive React 18 StrictMode double-invoke in dev.
  const didBoot = useRef(false);
  useEffect(() => {
    if (didBoot.current) return;
    didBoot.current = true;
    const adminGang = community.gangs.find((g) => g.id === "community-admin");
    if (!adminGang || !adminGang.curatorCorpusId) return;
    const navigator = adminGang.corpora.find((c) => c.id === adminGang.curatorCorpusId);
    if (!navigator) return;
    openTabForCorpus(adminGang, navigator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const currentGangId = orientedGang?.id ?? null;
  const visibleTabs = currentGangId ? tabsByGang[currentGangId] ?? [] : [];
  const activeTabId = currentGangId ? activeTabIdByGang[currentGangId] ?? null : null;
  const activeTab = visibleTabs.find((tab) => tab.id === activeTabId) ?? null;

  // Slice four: walking-into-gang = walking-into-curator gesture (c96e3b5d).
  // When orienting on a gang that has no active tab (fresh visit OR all tabs
  // closed), auto-open the gang's designated curator. If tabs exist with an
  // active one, preserve the per-gang state from slice three.
  const handleGangSelect = (gang: Gang) => {
    setOrientedGang(gang);
    const existingTabs = tabsByGang[gang.id] ?? [];
    const currentActive = activeTabIdByGang[gang.id] ?? null;
    const shouldAutoOpen = existingTabs.length === 0 || currentActive === null;
    if (!shouldAutoOpen || !gang.curatorCorpusId) return;
    const existingCuratorTab = existingTabs.find((t) => t.corpusId === gang.curatorCorpusId);
    if (existingCuratorTab) {
      setActiveTabIdForGang(gang.id, existingCuratorTab.id);
      return;
    }
    const curator = gang.corpora.find((c) => c.id === gang.curatorCorpusId);
    if (curator) openTabForCorpus(gang, curator);
  };

  // Slice four: back-arrow is two-level. From any non-community-admin gang it
  // returns to community-admin (the navigator's home, with chat state warm).
  // From community-admin it returns to the true community-level rail view
  // (orientedGang = null → flat gang list, chat shows the transient "Select a
  // gang" state). That gives users a path to navigate between gangs without
  // ever losing the per-gang tab strips they've accumulated.
  const handleGangBack = () => {
    if (orientedGang?.id === "community-admin") {
      setOrientedGang(null);
      return;
    }
    const adminGang = community.gangs.find((g) => g.id === "community-admin");
    setOrientedGang(adminGang ?? null);
  };

  const setTabsForGang = useCallback((gangId: string, mutator: (prev: ChatTab[]) => ChatTab[]) => {
    setTabsByGang((prev) => ({ ...prev, [gangId]: mutator(prev[gangId] ?? []) }));
  }, []);

  const setActiveTabIdForGang = useCallback((gangId: string, id: string | null) => {
    setActiveTabIdByGang((prev) => ({ ...prev, [gangId]: id }));
  }, []);

  // Tab creation always seeds coldOpen as null; the CenterPane cold-open subscriber
  // populates it via onColdOpenReady. The window event also fires here so any
  // future cross-tree subscriber stays consistent.
  const openTabForCorpus = useCallback(
    (gang: Gang, corpus: Corpus, seedUserMessage?: string): ChatTab => {
      const newTab: ChatTab = {
        id: `tab-${corpus.id}-${Date.now()}`,
        corpusId: corpus.id,
        corpusName: corpus.name,
        gangId: gang.id,
        messages: seedUserMessage
          ? [{ id: `msg-${Date.now()}-user`, role: "user", content: seedUserMessage, timestamp: new Date() }]
          : [],
        coldOpen: null,
      };
      setTabsForGang(gang.id, (prev) => [...prev, newTab]);
      setActiveTabIdForGang(gang.id, newTab.id);
      window.dispatchEvent(
        new CustomEvent("noodal:cold-open", {
          detail: { type: "cold-open", corpusId: corpus.id, gangId: gang.id, tabId: newTab.id },
        }),
      );
      return newTab;
    },
    [setTabsForGang, setActiveTabIdForGang],
  );

  const handleCorpusSelect = (corpus: Corpus) => {
    if (!orientedGang) return;
    const existing = (tabsByGang[orientedGang.id] ?? []).find((t) => t.corpusId === corpus.id);
    if (existing) {
      setActiveTabIdForGang(orientedGang.id, existing.id);
      return;
    }
    openTabForCorpus(orientedGang, corpus);
  };

  // Canonical landing path for inline corpus link clicks AND future deep-links.
  // Always opens a fresh tab in the target gang (cross-gang causes rail to re-orient).
  const landInCorpus = (gangId: string, corpusId: string) => {
    const gang = community.gangs.find((g) => g.id === gangId);
    if (!gang) return;
    const corpus = gang.corpora.find((c) => c.id === corpusId);
    if (!corpus) return;
    setOrientedGang(gang);
    openTabForCorpus(gang, corpus);
  };

  // Wired into CenterPane via the noodal:cold-open subscriber. The subscriber
  // computes welcomeMessageFor(corpusName) and calls back here. Spec Phase 2.
  const handleColdOpenReady = useCallback(
    (gangId: string, tabId: string, message: Message) => {
      setTabsForGang(gangId, (prev) => prev.map((t) => (t.id === tabId ? { ...t, coldOpen: message } : t)));
    },
    [setTabsForGang],
  );

  const handleTabClose = (tabId: string) => {
    if (!currentGangId) return;
    const tabs = tabsByGang[currentGangId] ?? [];
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabsForGang(currentGangId, () => newTabs);
    if (activeTabId === tabId) {
      setActiveTabIdForGang(currentGangId, newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleTabSelect = (tabId: string) => {
    if (!currentGangId) return;
    setActiveTabIdForGang(currentGangId, tabId);
  };

  const handleTabRename = (tabId: string, title: string) => {
    if (!currentGangId) return;
    setTabsForGang(currentGangId, (prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: title.trim() || t.title } : t)),
    );
  };

  // Auto-evict-oldest on overflow (spec Phase 1). CenterPane measures width and
  // calls this with the IDs of tabs to evict. Evicted tabs drop into the gang's
  // Chat history (folded into Phase 1 per spec note — no Phase 8 deferral).
  const handleAutoEvict = useCallback(
    (tabIds: string[]) => {
      if (!currentGangId || tabIds.length === 0) return;
      const tabs = tabsByGang[currentGangId] ?? [];
      const evicted = tabs.filter((t) => tabIds.includes(t.id));
      const remaining = tabs.filter((t) => !tabIds.includes(t.id));
      setTabsForGang(currentGangId, () => remaining);
      if (activeTabId && tabIds.includes(activeTabId)) {
        setActiveTabIdForGang(currentGangId, remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      if (evicted.length > 0) {
        const entries: ChatHistoryEntry[] = evicted.map((t) => ({
          id: `hist-${t.id}`,
          gangId: t.gangId,
          corpusId: t.corpusId,
          timestamp: new Date(),
          title: fallbackTitle(t),
        }));
        setChatHistoryByGang((prev) => ({
          ...prev,
          [currentGangId]: [...entries, ...(prev[currentGangId] ?? [])],
        }));
      }
    },
    [activeTabId, currentGangId, setActiveTabIdForGang, setTabsForGang, tabsByGang],
  );

  // "+ new session" handler (spec Phase 1). Opens a fresh tab on the active
  // corpus when one is active; otherwise the gang's curator (first corpus in
  // gang). Walking into a gang and walking into its curator are the same gesture
  // per c96e3b5d.
  const handleNewSession = () => {
    if (!orientedGang) return;
    const targetCorpusId = activeTab?.corpusId ?? orientedGang.corpora[0]?.id;
    if (!targetCorpusId) return;
    const corpus = orientedGang.corpora.find((c) => c.id === targetCorpusId);
    if (!corpus) return;
    openTabForCorpus(orientedGang, corpus);
  };

  // Stubbed forwarding-prompt generator for slice three. Real summary will be
  // generated by the corpus when corpus-model work lands.
  const requestForwardingPrompt = (_tabId: string): string =>
    "[Forwarding prompt placeholder — real summary will be generated by the corpus]";

  // Continue Session (spec Phase 3). Opens a new tab seeded with the forwarding
  // prompt as the user's first turn; marks the original tab with continuedInTabId.
  const handleContinueSession = (tabId: string) => {
    if (!currentGangId || !orientedGang) return;
    const tab = (tabsByGang[currentGangId] ?? []).find((t) => t.id === tabId);
    if (!tab) return;
    const corpus = orientedGang.corpora.find((c) => c.id === tab.corpusId);
    if (!corpus) return;
    const forwardingPrompt = requestForwardingPrompt(tabId);
    const newTab = openTabForCorpus(orientedGang, corpus, forwardingPrompt);
    setTabsForGang(currentGangId, (prev) => prev.map((t) => (t.id === tabId ? { ...t, continuedInTabId: newTab.id } : t)));
  };

  const handleSendMessage = (tabId: string, content: string) => {
    if (!currentGangId) return;
    setTabsForGang(currentGangId, (prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        const userMessage: Message = {
          id: `msg-${Date.now()}-user`,
          role: "user",
          content,
          timestamp: new Date(),
        };
        const assistantMessage = makeAssistantReply(content);
        return {
          ...tab,
          messages: [...tab.messages, userMessage, assistantMessage],
        };
      }),
    );
  };

  const handleQuickAskClick = (ask: QuickAsk) => {
    if (activeTabId) handleSendMessage(activeTabId, ask.text);
  };

  const handleResolveQA = (tabId: string, messageId: string, resolution: QABlockResolution) => {
    if (!currentGangId) return;
    setTabsForGang(currentGangId, (prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          messages: tab.messages.map((m) => (m.id === messageId ? { ...m, qaResolution: resolution } : m)),
        };
      }),
    );
  };

  const handleRetryMessage = (tabId: string, messageId: string) => {
    if (!currentGangId) return;
    setTabsForGang(currentGangId, (prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          messages: tab.messages.map((m) => (m.id === messageId ? { ...m, isError: false } : m)),
        };
      }),
    );
  };

  // Stub exposed for demo per spec Phase 7. Triggers a QABlock inline in the
  // active tab as if the corpus had asked. Real WHEN-to-fire logic is sagacity-lead's.
  // Reachable via the console as window.triggerQABlock(spec?) and via the
  // "demo: trigger q&a" quick ask.
  useEffect(() => {
    (window as unknown as { triggerQABlock?: (spec?: Partial<QABlockSpec>) => void }).triggerQABlock = (spec) => {
      if (!currentGangId || !activeTabId) return;
      const message: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: spec?.prompt ? "" : "I need a bit more direction before I continue:",
        qaBlock: {
          id: `qa-${Date.now()}`,
          prompt: spec?.prompt ?? "Which path should we take?",
          options: spec?.options ?? { type: "single", choices: ["Option A", "Option B", "Option C"] },
          allowOther: spec?.allowOther ?? true,
          allowSkip: spec?.allowSkip ?? true,
          allowStop: spec?.allowStop ?? true,
        },
        timestamp: new Date(),
      };
      setTabsForGang(currentGangId, (prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, messages: [...t.messages, message] } : t)),
      );
    };
  }, [activeTabId, currentGangId, setTabsForGang]);

  const selectedCorpusId = activeTab?.corpusId;
  const status = activeTab ? statusFor(activeTab.corpusName) : "";
  const currentChatHistory = currentGangId ? chatHistoryByGang[currentGangId] ?? [] : [];

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
            community={community}
            currentGangId={currentGangId}
            tabs={visibleTabs}
            activeTabId={activeTabId}
            onTabClose={handleTabClose}
            onTabSelect={handleTabSelect}
            onTabRename={handleTabRename}
            onAutoEvict={handleAutoEvict}
            onNewSession={handleNewSession}
            onSendMessage={handleSendMessage}
            onContinueSession={handleContinueSession}
            onLandInCorpus={landInCorpus}
            onColdOpenReady={handleColdOpenReady}
            onResolveQA={handleResolveQA}
            onRetryMessage={handleRetryMessage}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <RightPane
            status={status}
            chatHistory={currentChatHistory}
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
