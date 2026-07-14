import type { ReactNode } from "react";
import { MarketingHeader, MarketingFooter, sans } from "../marketing/MarketingChrome";

// Shared card shell for the unauthenticated onboarding screens (signup,
// verify-email, connect-your-MCP, forgot-password). Mirrors LoginScreen's
// centered-card visual language so the whole pre-auth surface feels of a piece.
//
// `step` renders a light progress hint for the signup → verify → connect flow.
// `chrome` wraps the card in the marketing header + footer so the surface keeps
// the noodal branding when arriving from the public site (e.g. signup).
export type OnboardingStep = "signup" | "verify" | "connect";

const STEP_ORDER: OnboardingStep[] = ["signup", "verify", "connect"];
const STEP_LABEL: Record<OnboardingStep, string> = {
  signup: "Create account",
  verify: "Verify email",
  connect: "Connect your MCP",
};

export function OnboardingShell({
  title,
  subtitle,
  step,
  children,
  footer,
  chrome = false,
}: {
  title: string;
  subtitle?: string;
  step?: OnboardingStep;
  children: ReactNode;
  footer?: ReactNode;
  chrome?: boolean;
}) {
  const card = (
    <div className="w-full max-w-sm border border-border rounded-lg p-6 space-y-5 my-8 bg-background">
      {step && (
          <ol className="flex items-center gap-1.5" aria-label="Onboarding progress">
            {STEP_ORDER.map((s, i) => {
              const active = s === step;
              const done = STEP_ORDER.indexOf(step) > i;
              return (
                <li key={s} className="flex items-center gap-1.5 flex-1">
                  <span
                    className={
                      "h-1.5 flex-1 rounded-full " +
                      (active || done ? "bg-primary" : "bg-muted")
                    }
                    aria-current={active ? "step" : undefined}
                    title={STEP_LABEL[s]}
                  />
                </li>
              );
            })}
          </ol>
        )}

        <div className="space-y-1">
          <h1 className="text-lg font-medium">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="pt-1 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );

  if (!chrome) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 overflow-y-auto">
        {card}
      </div>
    );
  }

  return (
    <div style={{ ...sans, background: "#fff" }} className="flex min-h-screen w-full flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-4">{card}</main>
      <MarketingFooter />
    </div>
  );
}

// Reusable "this part lands at launch" banner — keeps the Phase-A shell honest
// about what does and does not actually create an account yet.
export function PhaseBNotice({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs text-muted-foreground border border-border rounded-md p-3 bg-muted/40">
      {children}
    </div>
  );
}
