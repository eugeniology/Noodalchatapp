// Membrane API base URL — shared by the session layer (membraneSession.ts) and
// the REST client (membraneApi.ts). Kept in its own module so the two can share
// it without an import cycle. Defaults to the deployed dev membrane; override
// with VITE_MEMBRANE_BASE (e.g. http://localhost:8000 for a local membrane).
export const BASE =
  (import.meta as { env?: Record<string, string> }).env?.VITE_MEMBRANE_BASE ??
  "https://dev.sagacityapps.com";

// MCP server URL the consumer connects their own MCP client (Claude.ai etc.) to.
// This is the launch consumer surface (BYOM/MCP-first, scope 44a9c02f): the user
// reaches their noodal through their MCP client against membrane. The connector
// path is /mcp/mcp (the connect-the-app URL fix). Override with
// VITE_MCP_CONNECT_URL; defaults to <membrane base>/mcp/mcp.
export const MCP_CONNECT_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_MCP_CONNECT_URL ??
  `${BASE}/mcp/mcp`;
