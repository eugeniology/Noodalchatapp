import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
import { CenterPane } from "./components/CenterPane";
import { RightPane } from "./components/RightPane";
import { ScratchPad } from "./components/ScratchPad";
import { ModelsPage, ProfilePage, type AdminPage } from "./components/AdminPages";
import { MembersAccessPage } from "./components/MembersAccessPage";
import { LoginScreen } from "./components/LoginScreen";
import { Button } from "./components/ui/button";
import { membraneApi } from "./lib/membraneApi";
import { loadCommunity } from "./lib/communityData";
import {
  clearMembraneSession,
  hasMembraneSession,
  logout,
  subscribeUnauthorized,
  validateSession,
  type UserInfo,
} from "./lib/membraneSession";
import type {
  Community,
  Gang,
  Corpus,
  ChatTab,
  Message,
  ChatHistoryEntry,
  Loop,
  LoopStatus,
  QuickAsk,
  QABlockSpec,
  QABlockResolution,
} from "./types";

// Quick-asks are UI prompt presets, not corpus data — there is no membrane
// quick-asks endpoint, so these stay app-level (unlike the rail/loops, which are
// now live reads). The "demo:*" presets exercise the chat-render primitives.
const QUICK_ASKS: QuickAsk[] = [
  { id: "qa1", text: "self-summary" },
  { id: "qa2", text: "what's blocked" },
  { id: "qa3", text: "demo: tool use" },
  { id: "qa4", text: "demo: trigger q&a" },
  { id: "qa5", text: "demo: error response" },
];

function statusFor(name: string): string {
  return `${name} — live corpus. Status detail wires up alongside the imprint read route.`;
}

// The community-home gang (c96e3b5d): its curator IS the community navigator and
// orienting on it is the community level. Picked by the isCommunityHome flag the
// live data layer sets, falling back to the first gang.
function pickHomeGang(community: Community): Gang {
  return community.gangs.find((g) => g.isCommunityHome) ?? community.gangs[0];
}

function pickNavigator(community: Community): Corpus {
  const gang = pickHomeGang(community);
  return gang.corpora.find((c) => c.id === gang.curatorCorpusId) ?? gang.corpora[0];
}

// Membrane loop status (enum value, e.g. "observing"/"closed"/"acting") → the
// three-value UI LoopStatus the right-pane badge renders.
function normalizeLoopStatus(s: string): LoopStatus {
  const v = (s.split(".").pop() ?? s).toUpperCase();
  if (v.startsWith("CLOS")) return "CLOSED";
  if (v.startsWith("ACT")) return "ACTIVE";
  return "OBSERVING";
}

// Welcome / cold-open content. Branched by corpus.role per e3922a4d Phase A
// model: navigator-character (engagement, cross-scope orientation), curator-
// character (administrator, gang-internal), or standard.
export function welcomeMessageFor(corpus: Corpus, gang: Gang): Message {
  const askLines = QUICK_ASKS.slice(0, 3).map((q) => `• ${q.text}`).join("\n");
  let opener: string;
  if (corpus.role === "navigator") {
    opener =
      `${corpus.name} — I help you find your way across ${gang.isCommunityHome ? "this community" : `the ${gang.name} gang`}.\n` +
      `Ask me what's active, who owns what, where a topic lives.\n\n` +
      `Most asked of me lately:\n${askLines}`;
  } else if (corpus.role === "curator") {
    opener =
      `${statusFor(corpus.name)}\n\nI administer the ${gang.name} gang. Ask me about its corpora, its loops, what's blocked, recent decisions.\n\n` +
      `Most asked of me lately:\n${askLines}`;
  } else {
    opener =
      `${statusFor(corpus.name)}\n\nMost asked of me lately:\n${askLines}`;
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

interface WorkspaceProps {
  community: Community;
  me: UserInfo | null;
  onSignIn: () => void;
  onLogout: () => void;
}

// The loaded workspace. Receives a non-null community (the App gate handles
// auth + data loading + empty/error states) and is keyed by community.id so the
// oriented-state initializers re-run if the active community changes.
function Workspace({ community, me, onSignIn, onLogout }: WorkspaceProps) {
  const [isDark, setIsDark] = useState(false);

  // Three-scope takeover (c96e3b5d):
  //   • Community level → orientedGang === community-admin (LeftRail renders
  //     gang list, no dock-row, community-admin filtered out)
  //   • Gang level     → orientedGang is any non-admin gang (LeftRail renders
  //     dock-row + corpus list)
  //   • Corpus level   → same rail as gang level, with orientedCorpus !==
  //     gang.curator (corpus row highlighted as selected)
  //
  // orientedGang is never null — community-admin IS the community level.
  // orientedCorpus is always set — community-navigator at boot, gang.curator
  // on gang orient, clicked corpus on corpus orient.
  const [orientedGang, setOrientedGang] = useState<Gang>(() => pickHomeGang(community));
  const [orientedCorpus, setOrientedCorpus] = useState<Corpus>(() => pickNavigator(community));

  // Per-oriented-corpus loops for the right pane — replaces the old seedLoops.
  // Fetched live from the membrane; degrades to an empty list on error.
  const [loops, setLoops] = useState<Loop[]>([]);
  useEffect(() => {
    let active = true;
    setLoops([]);
    membraneApi
      .listLoops(orientedCorpus.id)
      .then((rows) => {
        if (!active) return;
        setLoops(
          rows.map((r) => ({
            id: r.loop_id,
            name: r.title || r.workflow_id || "untitled loop",
            status: normalizeLoopStatus(r.status),
          })),
        );
      })
      .catch(() => {
        if (active) setLoops([]);
      });
    return () => {
      active = false;
    };
  }, [orientedCorpus.id]);

  const navigatorId = useMemo(() => pickNavigator(community).id, [community]);

  // Per-corpus tab state — retracts c698e710's per-gang lock. Each corpus has
  // its own tab strip; switching the active corpus swaps the visible strip.
  // Chat history is also per-corpus per c96e3b5d ("Chat history (last 5
  // sessions with this corpus)").
  const [tabsByCorpus, setTabsByCorpus] = useState<Record<string, ChatTab[]>>({});
  const [activeTabIdByCorpus, setActiveTabIdByCorpus] = useState<Record<string, string | null>>({});
  const [chatHistoryByCorpus, setChatHistoryByCorpus] = useState<Record<string, ChatHistoryEntry[]>>({});
  const [scratchPadOpen, setScratchPadOpen] = useState(false);
  // Admin pages takeover (Profile / Models). Opened via TopBar avatar dropdown.
  const [activeAdminPage, setActiveAdminPage] = useState<AdminPage | null>(null);
  const handleOpenAdmin = (page: AdminPage) => {
    // Close scratch pad if open so the takeover swap is clean.
    setScratchPadOpen(false);
    setActiveAdminPage(page);
  };
  // ScratchPad → Models bridge: when no chat token is set, ScratchPad surfaces
  // a button that opens the Models settings.
  const handleOpenModelsFromScratchPad = () => {
    setScratchPadOpen(false);
    setActiveAdminPage("models");
  };

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const handleToggleLeftRail = () => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);
  const controlRightPanel = useCallback((action: "collapse" | "expand") => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (action === "collapse" && !panel.isCollapsed()) panel.collapse();
    if (action === "expand" && panel.isCollapsed()) panel.expand();
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const setTabsForCorpus = useCallback((corpusId: string, mutator: (prev: ChatTab[]) => ChatTab[]) => {
    setTabsByCorpus((prev) => ({ ...prev, [corpusId]: mutator(prev[corpusId] ?? []) }));
  }, []);

  const setActiveTabIdForCorpus = useCallback((corpusId: string, id: string | null) => {
    setActiveTabIdByCorpus((prev) => ({ ...prev, [corpusId]: id }));
  }, []);

  // Tab creation seeds coldOpen=null; CenterPane's noodal:cold-open subscriber
  // populates it via onColdOpenReady. The window event also fires here for
  // cross-tree decoupling per e0d67b77.
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
      setTabsForCorpus(corpus.id, (prev) => [...prev, newTab]);
      setActiveTabIdForCorpus(corpus.id, newTab.id);
      window.dispatchEvent(
        new CustomEvent("noodal:cold-open", {
          detail: { type: "cold-open", corpusId: corpus.id, gangId: gang.id, tabId: newTab.id },
        }),
      );
      return newTab;
    },
    [setTabsForCorpus, setActiveTabIdForCorpus],
  );

  // Whenever orientedCorpus changes, make sure that corpus has an active tab.
  // No tabs → open a fresh one. Tabs but no active → activate the most recent.
  // Already-active → no-op. This is the single funnel through which every
  // orientation gesture produces a usable chat surface.
  const didBoot = useRef(false);
  useEffect(() => {
    const existing = tabsByCorpus[orientedCorpus.id] ?? [];
    const currentActive = activeTabIdByCorpus[orientedCorpus.id] ?? null;
    if (existing.length === 0) {
      // Fresh corpus orient → open a tab. Guard the boot case with didBoot to
      // survive React 18 StrictMode's effect double-invoke.
      if (!didBoot.current && orientedCorpus.id === navigatorId) {
        didBoot.current = true;
      }
      openTabForCorpus(orientedGang, orientedCorpus);
      return;
    }
    if (!currentActive) {
      setActiveTabIdForCorpus(orientedCorpus.id, existing[existing.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientedCorpus, orientedGang]);

  const handleGangSelect = (gang: Gang) => {
    // c96e3b5d: walking-into-gang = walking-into-curator. Orient on the gang
    // AND set orientedCorpus to that gang's curator. ensureTabForCorpus
    // effect picks it up and opens/activates the curator tab.
    setOrientedGang(gang);
    if (!gang.curatorCorpusId) return;
    const curator = gang.corpora.find((c) => c.id === gang.curatorCorpusId);
    if (curator) setOrientedCorpus(curator);
  };

  // Back-arrow returns to community level: community-admin orientation,
  // community-navigator as active corpus.
  const handleGangBack = () => {
    setOrientedGang(pickHomeGang(community));
    setOrientedCorpus(pickNavigator(community));
  };

  const handleCorpusSelect = (corpus: Corpus) => {
    // Within the currently oriented gang: clicking a different corpus orients
    // on it. The orientedCorpus effect handles the rest.
    setOrientedCorpus(corpus);
  };

  // Canonical landing path for inline corpus link clicks. Cross-gang click
  // re-orients the rail to the target gang (c96e3b5d "honest jolt").
  const landInCorpus = (gangId: string, corpusId: string) => {
    const gang = community.gangs.find((g) => g.id === gangId);
    if (!gang) return;
    const corpus = gang.corpora.find((c) => c.id === corpusId);
    if (!corpus) return;
    setOrientedGang(gang);
    setOrientedCorpus(corpus);
  };

  // Wired into CenterPane via the noodal:cold-open subscriber. The subscriber
  // computes welcomeMessageFor(corpus, gang) on event and calls back here.
  const handleColdOpenReady = useCallback(
    (_gangId: string, tabId: string, message: Message) => {
      // We don't know the corpusId from this call's signature; iterate to find
      // which corpus's tabs contain this tabId. Cheap because tabsByCorpus has
      // few entries.
      setTabsByCorpus((prev) => {
        const next = { ...prev };
        for (const [corpusId, tabs] of Object.entries(prev)) {
          if (tabs.some((t) => t.id === tabId)) {
            next[corpusId] = tabs.map((t) => (t.id === tabId ? { ...t, coldOpen: message } : t));
          }
        }
        return next;
      });
    },
    [],
  );

  const visibleTabs = tabsByCorpus[orientedCorpus.id] ?? [];
  const activeTabId = activeTabIdByCorpus[orientedCorpus.id] ?? null;
  const activeTab = visibleTabs.find((t) => t.id === activeTabId) ?? null;

  const handleTabClose = (tabId: string) => {
    const corpusId = orientedCorpus.id;
    const tabs = tabsByCorpus[corpusId] ?? [];
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabsForCorpus(corpusId, () => newTabs);
    if (activeTabId === tabId) {
      setActiveTabIdForCorpus(corpusId, newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleTabSelect = (tabId: string) => setActiveTabIdForCorpus(orientedCorpus.id, tabId);

  const handleTabRename = (tabId: string, title: string) => {
    setTabsForCorpus(orientedCorpus.id, (prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: title.trim() || t.title } : t)),
    );
  };

  // Auto-evict-oldest on overflow. Evicted tabs drop into the corpus's Chat
  // history (per c96e3b5d "sessions with this corpus"). Chat history is now
  // keyed by corpusId not gangId.
  const handleAutoEvict = useCallback(
    (tabIds: string[]) => {
      if (tabIds.length === 0) return;
      const corpusId = orientedCorpus.id;
      const tabs = tabsByCorpus[corpusId] ?? [];
      const evicted = tabs.filter((t) => tabIds.includes(t.id));
      const remaining = tabs.filter((t) => !tabIds.includes(t.id));
      setTabsForCorpus(corpusId, () => remaining);
      if (activeTabId && tabIds.includes(activeTabId)) {
        setActiveTabIdForCorpus(corpusId, remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      if (evicted.length > 0) {
        const entries: ChatHistoryEntry[] = evicted.map((t) => ({
          id: `hist-${t.id}`,
          gangId: t.gangId,
          corpusId: t.corpusId,
          timestamp: new Date(),
          title: fallbackTitle(t),
        }));
        setChatHistoryByCorpus((prev) => ({
          ...prev,
          [corpusId]: [...entries, ...(prev[corpusId] ?? [])],
        }));
      }
    },
    [activeTabId, orientedCorpus.id, setActiveTabIdForCorpus, setTabsForCorpus, tabsByCorpus],
  );

  // "+ new session" opens a fresh tab for the currently active corpus.
  const handleNewSession = () => {
    openTabForCorpus(orientedGang, orientedCorpus);
  };

  const requestForwardingPrompt = (_tabId: string): string =>
    "[Forwarding prompt placeholder — real summary will be generated by the corpus]";

  const handleContinueSession = (tabId: string) => {
    const tab = (tabsByCorpus[orientedCorpus.id] ?? []).find((t) => t.id === tabId);
    if (!tab) return;
    const forwardingPrompt = requestForwardingPrompt(tabId);
    const newTab = openTabForCorpus(orientedGang, orientedCorpus, forwardingPrompt);
    setTabsForCorpus(orientedCorpus.id, (prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, continuedInTabId: newTab.id } : t)),
    );
  };

  const handleSendMessage = (tabId: string, content: string) => {
    setTabsForCorpus(orientedCorpus.id, (prev) =>
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
    setTabsForCorpus(orientedCorpus.id, (prev) =>
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
    setTabsForCorpus(orientedCorpus.id, (prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          messages: tab.messages.map((m) => (m.id === messageId ? { ...m, isError: false } : m)),
        };
      }),
    );
  };

  useEffect(() => {
    (window as unknown as { triggerQABlock?: (spec?: Partial<QABlockSpec>) => void }).triggerQABlock = (spec) => {
      if (!activeTabId) return;
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
      setTabsForCorpus(orientedCorpus.id, (prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, messages: [...t.messages, message] } : t)),
      );
    };
  }, [activeTabId, orientedCorpus.id, setTabsForCorpus]);

  const status = statusFor(orientedCorpus.name);
  const currentChatHistory = chatHistoryByCorpus[orientedCorpus.id] ?? [];

  return (
    <div className="size-full flex flex-col bg-background">
      <TopBar
        community={community}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAdmin={handleOpenAdmin}
        me={me}
        onSignIn={onSignIn}
        onLogout={onLogout}
      />

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
            selectedCorpusId={orientedCorpus.id}
            isCollapsed={leftRailCollapsed}
            onToggleCollapse={handleToggleLeftRail}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={57} minSize={40}>
          <CenterPane
            community={community}
            currentGangId={orientedGang.id}
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

        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={25}
          minSize={20}
          maxSize={35}
          collapsible
          collapsedSize={4}
          onCollapse={() => setRightPaneCollapsed(true)}
          onExpand={() => setRightPaneCollapsed(false)}
        >
          <RightPane
            status={status}
            chatHistory={currentChatHistory}
            loops={loops}
            quickAsks={QUICK_ASKS}
            onQuickAskClick={handleQuickAskClick}
            panelCollapsed={rightPaneCollapsed}
            onControlPanel={controlRightPanel}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {scratchPadOpen && (
        <ScratchPad
          onClose={() => setScratchPadOpen(false)}
          onOpenModelsSettings={handleOpenModelsFromScratchPad}
        />
      )}
      {activeAdminPage === "profile" && <ProfilePage onClose={() => setActiveAdminPage(null)} />}
      {activeAdminPage === "models" && <ModelsPage onClose={() => setActiveAdminPage(null)} />}
      {activeAdminPage === "access" && (
        <MembersAccessPage
          communityId={community.id}
          gangId={orientedGang.id}
          gangName={orientedGang.name}
          corpora={orientedGang.corpora}
          focusCorpusId={orientedCorpus?.id}
          onClose={() => setActiveAdminPage(null)}
        />
      )}
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-full flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-4">{children}</div>
    </div>
  );
}

// Vite sets import.meta.env.DEV true under `vite dev` (the laptop loopback) and
// false in a production build. It is the signal for "login is optional here":
// in dev the X-Scope fallback serves with no login (spec AC-5); in a hosted
// build a Cognito login is required (spec AC-1).
const IS_DEV: boolean =
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;

// App gate: resolves auth + loads the live rail data, then renders the Workspace.
// Handles the login screen, loading, and empty/error shells so the Workspace
// itself always receives a non-null, non-empty community.
export default function App() {
  const [me, setMe] = useState<UserInfo | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [phase, setPhase] = useState<"loading" | "login" | "ready">("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const loadData = useCallback(async () => {
    setDataError(null);
    try {
      setCommunity(await loadCommunity());
    } catch (e) {
      setCommunity(null);
      setDataError((e as Error).message || "Could not load workspace.");
    }
  }, []);

  const boot = useCallback(async () => {
    setPhase("loading");
    const identity = hasMembraneSession() ? await validateSession() : null;
    // Stored token present but invalid + unrefreshable → drop it.
    if (hasMembraneSession() && !identity) clearMembraneSession();
    setMe(identity);
    if (!identity && !IS_DEV) {
      setPhase("login");
      return;
    }
    await loadData();
    setPhase("ready");
  }, [loadData]);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Mid-session expiry: membraneApi cleared the token and emitted this. Route to
  // login in prod; in dev fall back to the X-Scope path by re-booting.
  useEffect(() => {
    return subscribeUnauthorized(() => {
      setMe(null);
      setShowLogin(false);
      if (IS_DEV) {
        void boot();
      } else {
        setCommunity(null);
        setPhase("login");
      }
    });
  }, [boot]);

  const handleAuthed = useCallback(
    (identity: UserInfo) => {
      setMe(identity);
      setShowLogin(false);
      setPhase("loading");
      void loadData().then(() => setPhase("ready"));
    },
    [loadData],
  );

  const handleLogout = useCallback(() => {
    logout();
    setMe(null);
    setShowLogin(false);
    if (IS_DEV) {
      // Drop back to the dev X-Scope path and reload unfiltered.
      setPhase("loading");
      void loadData().then(() => setPhase("ready"));
    } else {
      setCommunity(null);
      setPhase("login");
    }
  }, [loadData]);

  // Login: forced (prod, no session) is non-dismissable; the explicit overlay
  // (dev "Sign in", or switching account) can be cancelled back to the app.
  if (phase === "login" || showLogin) {
    const forced = phase === "login";
    return (
      <LoginScreen
        onAuthed={handleAuthed}
        onCancel={forced ? undefined : () => setShowLogin(false)}
      />
    );
  }

  if (phase === "loading") {
    return (
      <CenteredShell>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </CenteredShell>
    );
  }

  if (!community) {
    return (
      <CenteredShell>
        <p className="text-sm text-destructive">{dataError ?? "Could not load workspace."}</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => void boot()}>Retry</Button>
          <Button variant="ghost" onClick={() => setShowLogin(true)}>
            Sign in
          </Button>
        </div>
      </CenteredShell>
    );
  }

  if (community.gangs.length === 0) {
    return (
      <CenteredShell>
        <p className="text-sm text-muted-foreground">
          No accessible corpora yet. Ask an owner or admin to grant you access.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => void boot()}>Refresh</Button>
          {me ? (
            <Button variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setShowLogin(true)}>
              Sign in
            </Button>
          )}
        </div>
      </CenteredShell>
    );
  }

  return (
    <Workspace
      key={community.id}
      community={community}
      me={me}
      onSignIn={() => setShowLogin(true)}
      onLogout={handleLogout}
    />
  );
}
