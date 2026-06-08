// Membrane API base URL — shared by the session layer (membraneSession.ts) and
// the REST client (membraneApi.ts). Kept in its own module so the two can share
// it without an import cycle. Defaults to the deployed dev membrane; override
// with VITE_MEMBRANE_BASE (e.g. http://localhost:8000 for a local membrane).
export const BASE =
  (import.meta as { env?: Record<string, string> }).env?.VITE_MEMBRANE_BASE ??
  "https://dev.sagacityapps.com";
