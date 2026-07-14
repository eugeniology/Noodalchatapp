import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { OnboardingShell } from "./OnboardingShell";
import { MCP_CONNECT_URL } from "../../lib/membraneBase";
import { MCP_CLIENTS } from "../../lib/mcpClients";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

// Connect-your-MCP screen: the launch consumer surface (scope 44a9c02f,
// BYOM/MCP-first). Noodal is client-agnostic: the same connector URL works
// with any MCP-speaking tool (Claude, ChatGPT, Gemini, Cursor, VS Code, etc.),
// so this screen picks a client and shows that client's setup steps rather
// than assuming Claude.ai. This screen is the real instructions; the only
// Phase-B seam is the per-account corpus name, which is filled once the
// provisioning saga runs (today it shows a placeholder).

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-muted text-foreground text-xs font-medium flex items-center justify-center">
        {n}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

export function ConnectMcpScreen() {
  const [copied, setCopied] = useState(false);
  const [clientId, setClientId] = useState(MCP_CLIENTS[0].id);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONNECT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the URL is shown inline to copy by hand */
    }
  };

  return (
    <OnboardingShell
      title="Connect your MCP client"
      subtitle="Use your noodal from any MCP client."
      step="connect"
      footer={
        <>
          Done?{" "}
          <Link to="/" className="text-foreground underline underline-offset-4">
            Go to your account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Your MCP server URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono break-all">
              {MCP_CONNECT_URL}
            </code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-muted-foreground">Your client</label>
          <Tabs value={clientId} onValueChange={setClientId}>
            <TabsList className="flex-wrap h-auto">
              {MCP_CLIENTS.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {MCP_CLIENTS.map((c) => (
              <TabsContent key={c.id} value={c.id}>
                <ol className="space-y-4">
                  {c.steps.map((s, i) => (
                    <Step key={i} n={i + 1} title={s} />
                  ))}
                  <Step n={c.steps.length + 1} title="Start building knowledge">
                    Ask your MCP client to find, read, and write to{" "}
                    <span className="text-foreground">your noodal</span>. Your own
                    model does the reasoning; Noodal keeps and compounds the
                    knowledge.
                  </Step>
                </ol>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </OnboardingShell>
  );
}
