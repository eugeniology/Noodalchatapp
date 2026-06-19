import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { OnboardingShell, PhaseBNotice } from "./OnboardingShell";
import { MCP_CONNECT_URL } from "../../lib/membraneBase";

// Connect-your-MCP screen — the launch consumer surface (scope 44a9c02f,
// BYOM/MCP-first). The user reaches their noodal through their own MCP client
// (Claude.ai etc.) pointed at membrane. This screen is the real instructions;
// the only Phase-B seam is the per-account corpus name, which is filled once the
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

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONNECT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the URL is shown inline to copy by hand */
    }
  };

  return (
    <OnboardingShell
      title="Connect your MCP client"
      subtitle="Use your noodal from Claude.ai (or any MCP client) with your own model."
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

        <ol className="space-y-4">
          <Step n={1} title="Add a connector in Claude.ai">
            Settings → Connectors → Add custom connector, and paste the URL above.
          </Step>
          <Step n={2} title="Sign in with your Noodal account">
            Your client opens a Noodal login — authorize it to reach your corpus.
          </Step>
          <Step n={3} title="Start building knowledge">
            Ask your MCP client to find, read, and write to{" "}
            <span className="text-foreground">your noodal</span>. Your own model
            does the reasoning — Noodal keeps and compounds the knowledge.
          </Step>
        </ol>

        <PhaseBNotice>
          Your noodal is created and named the first time you sign up at launch
          (Phase B). The connector URL above is live now.
        </PhaseBNotice>
      </div>
    </OnboardingShell>
  );
}
