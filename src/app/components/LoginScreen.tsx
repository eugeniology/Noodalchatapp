import { useState } from "react";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { completeTempPassword, login, type UserInfo } from "../lib/membraneSession";

// SPA login screen — connect-the-app v0, piece B (loop 33c9f394 / spec
// bf4d7c86). Calls POST /auth/login (membrane → Cognito), which stores the
// Cognito ID token at localStorage["noodal.membraneToken"]. On success the app
// gate re-validates and renders the workspace.
//
// NON-LEAKING: the membrane returns a generic "Invalid email or password" for
// both bad password and unknown account, so the error text reveals nothing
// about whether an account exists (spec AC-1).
//
// TEMP-PASSWORD STEP (loop 3722374d): an admin-invited account (temp-password
// mode, loop d8d1233a) is FORCE_CHANGE_PASSWORD in Cognito. login() rejects
// that with a distinct 409 ("password_change_required") rather than the
// generic 401 — catching it here and prompting for a new password (instead of
// showing "Sign in failed") is what was previously a dead end for that
// invitee: there was no set-password surface at all.

interface LoginScreenProps {
  onAuthed: (me: UserInfo) => void;
  // In dev the login screen is dismissable (the X-Scope laptop path still
  // serves with no login). In prod there is no cancel — login is required.
  onCancel?: () => void;
}

export function LoginScreen({ onAuthed, onCancel }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await login(email.trim(), password);
      onAuthed(me);
    } catch (err) {
      if ((err as Error & { status?: number }).status === 409) {
        setNeedsNewPassword(true);
        setError(null);
      } else {
        setError((err as Error).message || "Sign in failed.");
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await completeTempPassword(email.trim(), password, newPassword);
      onAuthed(me);
    } catch (err) {
      setError((err as Error).message || "Could not set your new password.");
    } finally {
      setBusy(false);
    }
  };

  if (needsNewPassword) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <form
          onSubmit={submitNewPassword}
          className="w-full max-w-sm border border-border rounded-lg p-6 space-y-5"
        >
          <div className="space-y-1">
            <h1 className="text-lg font-medium">Set a new password</h1>
            <p className="text-sm text-muted-foreground">
              Your account was created with a temporary password. Choose a
              new password to continue.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="new-password">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1" disabled={!newPassword || busy}>
              {busy ? "Setting password…" : "Set password"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setNeedsNewPassword(false);
                setPassword("");
                setNewPassword("");
                setError(null);
              }}
              disabled={busy}
            >
              Back
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-border rounded-lg p-6 space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-medium">Sign in to Noodal</h1>
          <p className="text-sm text-muted-foreground">
            Use your Noodal account to continue.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="login-password">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" className="flex-1" disabled={!email.trim() || !password || busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <Link to="/signup" className="text-foreground underline underline-offset-4">
            Create account
          </Link>
          <Link to="/forgot-password" className="hover:text-foreground">
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
}
