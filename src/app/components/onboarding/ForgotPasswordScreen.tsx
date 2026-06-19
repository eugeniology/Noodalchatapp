import { Link } from "react-router";
import { OnboardingShell, PhaseBNotice } from "./OnboardingShell";

// Forgot-password — ROUTE STUB ONLY.
//
// This is launch-addendum 4f2c0b96 item 4 (auth completeness), which the
// addendum routes to THIS app loop (9071ed03). It is NOT in this session's
// Phase-A scope enumeration and the backend does not exist yet: membrane has no
// /auth/forgot-password or /auth/reset-password route (only login/refresh/me +
// PAT CRUD). Building it means new Cognito flows plus the email_verified=true
// propagation gotcha the addendum flags (noodal-api precedent 3794a78a).
//
// Per "flag, don't expand scope," Phase A ships only this placeholder + route so
// the link on the login screen resolves. The real flow is flagged back to
// sagacity-lead for sequencing.

export function ForgotPasswordScreen() {
  return (
    <OnboardingShell
      title="Reset your password"
      subtitle="Password reset is coming soon."
      footer={
        <Link to="/" className="text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <PhaseBNotice>
        Self-serve password reset lands alongside the launch auth surface. For now,
        contact support if you're locked out.
      </PhaseBNotice>
    </OnboardingShell>
  );
}
