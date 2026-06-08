import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  clearApiToken,
  clearChatToken,
  getApiToken,
  getChatToken,
  maskToken,
  notifyTokensChanged,
  setApiToken,
  setChatToken,
} from "../lib/tokens";

// Admin pages v1 — fullscreen takeover surfaces opened from the avatar
// dropdown in TopBar. Same shell pattern as ScratchPad (fixed inset-0, 48px
// header, Esc-to-close).

export type AdminPage = "profile" | "models" | "access";

interface PageProps {
  onClose: () => void;
}

function useEscToClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

export function AdminShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEscToClose(onClose);
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <h2 className="font-medium">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={`Close ${title}`}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// Profile page — placeholder. Identity is hardcoded for v1; real user-
// identity wires up alongside RBAC scoping (loop 11af7fc9).
export function ProfilePage({ onClose }: PageProps) {
  return (
    <AdminShell title="Profile" onClose={onClose}>
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Your identity</h3>
          <p className="text-sm text-muted-foreground">
            Editable when user-identity work lands. Placeholder values shown for v1.
          </p>
        </div>

        <div className="border border-border rounded-lg p-6 space-y-4">
          <FieldRow label="Name" value="Justin Eugene" />
          <FieldRow label="User ID" value="pinkflipflop" />
          <FieldRow label="Email" value="justineugene@gmail.com" />
          <FieldRow label="Org" value="sagacity" />
          <FieldRow label="Role" value="founder" />
        </div>

        <p className="text-xs text-muted-foreground">
          Profile editing, avatar customization, and per-corpus role scoping
          land alongside RBAC reconciliation (sagacity-lead loop 11af7fc9).
        </p>
      </div>
    </AdminShell>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}

// Models page — chat token (used by ScratchPad) + API token (reserved for
// backend-LLM, no consumer yet). Persists to localStorage via lib/tokens.ts.
export function ModelsPage({ onClose }: PageProps) {
  return (
    <AdminShell title="Models" onClose={onClose}>
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Anthropic API tokens</h3>
          <p className="text-sm text-muted-foreground">
            Both tokens are Anthropic API keys. The chat token is used directly
            from your browser by the scratch pad. The API token is reserved
            for the backend process LLM (e.g. when a corpus or actor calls
            Claude on your behalf via noodal-api).
          </p>
        </div>

        <TokenField
          label="Chat token"
          help="Used by the scratch pad to call the Claude API directly from your browser."
          getToken={getChatToken}
          saveToken={setChatToken}
          clearToken={clearChatToken}
        />

        <TokenField
          label="API token (optional)"
          help="Used by the backend process LLM when calling the Claude API on your behalf. Not yet wired — reserved for noodal-api integration."
          getToken={getApiToken}
          saveToken={setApiToken}
          clearToken={clearApiToken}
        />

        <div className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1">
          <p>
            Tokens are stored only in this browser's localStorage. Clear them
            at any time. Multi-tenant / encrypted-at-rest storage is a future
            iteration.
          </p>
          <p>
            <strong>Note:</strong> localStorage is readable by any script on
            this page (including via XSS). Acceptable for single-tenant local
            use; hosted-tenant deployments should move to backend-proxied keys.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function TokenField({
  label,
  help,
  getToken,
  saveToken,
  clearToken,
}: {
  label: string;
  help: string;
  getToken: () => string;
  saveToken: (v: string) => void;
  clearToken: () => void;
}) {
  const [stored, setStored] = useState<string>(() => getToken());
  const [draft, setDraft] = useState<string>("");
  const [editing, setEditing] = useState<boolean>(!getToken());
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const handleSave = () => {
    const value = draft.trim();
    if (!value) return;
    saveToken(value);
    setStored(value);
    setDraft("");
    setEditing(false);
    setJustSaved(true);
    notifyTokensChanged();
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleClear = () => {
    clearToken();
    setStored("");
    setDraft("");
    setEditing(true);
    notifyTokensChanged();
  };

  return (
    <div className="border border-border rounded-lg p-6 space-y-3">
      <div className="space-y-1">
        <h4 className="font-medium text-sm">{label}</h4>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>

      {stored && !editing ? (
        <div className="flex items-center gap-3">
          <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
            {maskToken(stored)}
          </code>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="sk-ant-..."
            className="flex-1"
            autoFocus={!stored}
          />
          <Button onClick={handleSave} disabled={!draft.trim()}>
            Save
          </Button>
          {stored && (
            <Button variant="ghost" onClick={() => { setEditing(false); setDraft(""); }}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {justSaved && (
        <p className="text-xs text-muted-foreground">Saved.</p>
      )}
    </div>
  );
}
