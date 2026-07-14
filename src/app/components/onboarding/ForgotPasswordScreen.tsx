import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { OnboardingShell } from "./OnboardingShell";
import { requestPasswordReset, confirmPasswordReset } from "../../lib/membraneSession";

// Self-serve password reset (loop 3949ec15) — the SELF-SERVE half of the
// born-confirmed invite flow. A user (typically an invitee whose Cognito
// email_verified=true was set at provision time, gotcha 3794a78a) sets their own
// password with ZERO founder involvement:
//
//   stage "request" → POST /auth/forgot-password → Cognito emails a reset code
//   stage "confirm" → POST /auth/reset-password (code + new password)
//   stage "done"    → password set; link to sign in
//
// Off-apex, no Cognito Hosted UI: this reuses the same custom-page + membrane-
// endpoint pattern as the rest of the funnel (signup/login/verify), so the auth
// UX stays visually of a piece with the launch re-skin. Deep-linkable
// (/forgot-password?email=…) so a "reset your password" link can land here.

type Stage = "request" | "confirm" | "done";

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      // Advance regardless: the endpoint never reveals whether the account
      // exists, so a code is "sent" for any address. The user proves ownership
      // by entering the code that actually landed in their inbox.
      setStage("confirm");
    } catch (err) {
      setError((err as Error).message || "Could not send a reset code. Try again later.");
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !newPassword || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset(email.trim(), code.trim(), newPassword);
      setStage("done");
    } catch (err) {
      setError((err as Error).message || "Could not reset your password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3">
      {error}
    </div>
  );

  if (stage === "done") {
    return (
      <OnboardingShell
        title="Password reset"
        subtitle="Your password has been updated."
        footer={
          <Link to="/" className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            You can now sign in with your new password.
          </p>
          <Button className="w-full" onClick={() => navigate("/")}>
            Sign in →
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  if (stage === "confirm") {
    return (
      <OnboardingShell
        title="Enter your reset code"
        subtitle={`If an account exists for ${email.trim() || "that email"}, we've sent a 6-digit code.`}
        footer={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStage("request");
            }}
            className="text-foreground underline underline-offset-4"
          >
            Use a different email
          </button>
        }
      >
        <form onSubmit={submitConfirm} className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="reset-code">
                Reset code
              </label>
              <Input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="reset-password">
                New password
              </label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {errorBox}

          <Button
            type="submit"
            className="w-full"
            disabled={!code.trim() || !newPassword || busy}
          >
            {busy ? "Setting password…" : "Set new password"}
          </Button>
        </form>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset code."
      footer={
        <Link to="/" className="text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submitRequest} className="space-y-5">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="reset-email">
            Email
          </label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </div>

        {errorBox}

        <Button type="submit" className="w-full" disabled={!email.trim() || busy}>
          {busy ? "Sending…" : "Send reset code"}
        </Button>
      </form>
    </OnboardingShell>
  );
}
