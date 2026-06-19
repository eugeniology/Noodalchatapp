import { useState } from "react";
import { Button } from "../ui/button";
import { MCP_CONNECT_URL } from "../../lib/membraneBase";
import type { UserInfo } from "../../lib/membraneSession";

// Post-login landing for a consumer (free, MCP-first launch). The consumer's
// noodal lives behind their MCP client (Claude.ai etc.), not in this web
// workspace, so a logged-in consumer has no platform corpora to render. Instead
// of the "no accessible corpora" dead-end, we land them here: how to connect
// their noodal to the AI tool of their choice, plus account access.
//
// MVP per founder Path-1 (MCP-first). The richer marketing/setup design
// (noodal.com) lands later; this is the basic, functional version.

const CLIENTS: { name: string; steps: string[] }[] = [
  {
    name: "Claude.ai (web)",
    steps: [
      "Settings → Connectors → Add custom connector",
      "Paste your MCP server URL (above) and save",
      "Authorize with your Noodal account when prompted",
    ],
  },
  {
    name: "Claude Desktop",
    steps: [
      "Settings → Connectors → Add custom connector",
      "Paste your MCP server URL and confirm",
      "Sign in with your Noodal account to authorize",
    ],
  },
  {
    name: "Cursor",
    steps: [
      "Settings → MCP → Add new server (HTTP)",
      "Paste your MCP server URL",
      "Complete the Noodal sign-in to connect",
    ],
  },
];

export function ConsumerLanding({
  me,
  onLogout,
}: {
  me: UserInfo | null;
  onLogout: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONNECT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the URL is shown inline to copy by hand */
    }
  };

  const who = me?.email || me?.user_id || "your account";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
        <span className="font-medium">noodal</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline truncate max-w-[14rem]" title={who}>
            {who}
          </span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium">Your noodal is ready.</h1>
            <p className="text-muted-foreground">
              Connect it to the AI tool you already use. Your own model does the
              thinking; your noodal remembers across every session — yours alone,
              exportable anytime, never anyone's training data.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Your MCP server URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {MCP_CONNECT_URL}
              </code>
              <Button variant="outline" size="sm" onClick={copyUrl}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Set it up in your client
            </h2>
            <div className="grid gap-4">
              {CLIENTS.map((c) => (
                <div key={c.name} className="border border-border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm">{c.name}</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {c.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Using another MCP client? Add a custom connector pointing at the URL
              above and authorize with your Noodal account.
            </p>
          </div>

          <div className="border-t border-border pt-6 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{who}</span>. The web
            chat experience is coming soon — for now your noodal lives in your MCP
            client.
          </div>
        </div>
      </main>
    </div>
  );
}
