import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { OnboardingShell, PhaseBNotice } from "./OnboardingShell";
import { SIGNUP_ENABLED, provisionSignup } from "../../lib/onboarding";
import { TurnstileWidget } from "../TurnstileWidget";
import { useHoneypot } from "../../lib/useHoneypot";

// Consumer signup screen — Phase A shell. Renders the real form and routes into
// the verify → connect flow so the launch onboarding is reviewable, but DOES NOT
// create an account: account creation is Phase B (loop e3af38bb), gated on the
// user-lifecycle ADR. See lib/onboarding.ts for the seam.

export function SignupScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const { honeypotField, isBot } = useHoneypot();

  const goVerify = (addr: string) =>
    navigate(`/verify-email?email=${encodeURIComponent(addr)}`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || busy || isBot()) return;

    // Phase A: the creation path is gated off. Walk the shell instead of calling
    // a backend that intentionally does not exist yet.
    if (!SIGNUP_ENABLED) {
      goVerify(email.trim());
      return;
    }

    // Phase B path (wired when SIGNUP_ENABLED flips true).
    setBusy(true);
    setError(null);
    try {
      const res = await provisionSignup({ email: email.trim(), password });
      goVerify(res.email);
    } catch (err) {
      setError((err as Error).message || "Could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      chrome
      title="Create your Noodal"
      subtitle="One free, private knowledge corpus — reachable from your own MCP client."
      step="signup"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {honeypotField}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="signup-email">
              Email
            </label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="signup-password">
              Password
            </label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {!SIGNUP_ENABLED && (
          <PhaseBNotice>
            Account creation opens at launch. This is a preview of the onboarding
            flow — continuing won't create an account yet.
          </PhaseBNotice>
        )}

        {error && (
          <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
            {error}
          </div>
        )}

        <TurnstileWidget onVerify={() => setVerified(true)} />

        <Button
          type="submit"
          className="w-full"
          disabled={!email.trim() || !password || busy || !verified}
        >
          {busy ? "Creating…" : SIGNUP_ENABLED ? "Create account" : "Preview onboarding →"}
        </Button>
      </form>
    </OnboardingShell>
  );
}
