import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "../ui/button";
import { OnboardingShell, PhaseBNotice } from "./OnboardingShell";
import { EMAIL_VERIFY_ENABLED } from "../../lib/onboarding";

// Email-verification screen — Phase A shell. Deep-linkable (/verify-email?email=…
// &token=…) so a real verification link can land here in Phase B. Phase A only
// renders the "check your inbox" state and routes onward; it does NOT confirm a
// token against Cognito (that, plus propagating email_verified=true per the
// noodal-api gotcha 3794a78a, is Phase B). See lib/onboarding.ts.

export function VerifyEmailScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const hasToken = !!params.get("token");

  return (
    <OnboardingShell
      title={hasToken ? "Confirming your email" : "Check your inbox"}
      subtitle={
        hasToken
          ? "Following the link from your email."
          : email
            ? `We'll send a verification link to ${email}.`
            : "We'll send you a verification link."
      }
      step="verify"
      footer={
        <>
          Wrong address?{" "}
          <Link to="/signup" className="text-foreground underline underline-offset-4">
            Start over
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Open the link in that email to confirm your account, then come back to
          connect your MCP client.
        </p>

        {!EMAIL_VERIFY_ENABLED && (
          <PhaseBNotice>
            Email delivery and link confirmation land at launch. For now, continue
            to preview the final step.
          </PhaseBNotice>
        )}

        <Button className="w-full" onClick={() => navigate("/onboarding")}>
          {EMAIL_VERIFY_ENABLED ? "I've verified — continue" : "Continue to MCP setup →"}
        </Button>
      </div>
    </OnboardingShell>
  );
}
