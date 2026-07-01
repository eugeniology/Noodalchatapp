// The MCP clients we give explicit setup steps for. Noodal is client-agnostic —
// any MCP-speaking tool works against the same connector URL — so this list is
// presentation only; keep it in one place so the funnel (ConnectMcpScreen) and
// the post-login landing (ConsumerLanding) can't drift out of sync with each
// other on which clients/steps are shown.

export type McpClient = {
  id: string;
  name: string;
  steps: string[];
};

export const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude",
    name: "Claude (web & desktop)",
    steps: [
      "Settings → Connectors → Add custom connector",
      "Paste your MCP server URL and save",
      "Authorize with your Noodal account when prompted",
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    steps: [
      "Settings → Connectors → Add connector",
      "Paste your MCP server URL and confirm",
      "Sign in with your Noodal account to authorize",
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    steps: [
      "Extensions / Connected apps → Add custom connector",
      "Paste your MCP server URL and save",
      "Sign in with your Noodal account to authorize",
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    steps: [
      "Settings → MCP → Add new server (HTTP)",
      "Paste your MCP server URL",
      "Complete the Noodal sign-in to connect",
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    steps: [
      "Command Palette → MCP: Add Server → HTTP",
      "Paste your MCP server URL",
      "Complete the Noodal sign-in to connect",
    ],
  },
  {
    id: "other",
    name: "Any other MCP client",
    steps: [
      "Add a custom / HTTP MCP connector in your client",
      "Paste your MCP server URL (above)",
      "Authorize with your Noodal account when prompted",
    ],
  },
];
