// Consumer onboarding seam — Phase A is SHELL + ROUTING ONLY.
//
// Loop eng-free-tier-launch-surface-v1 (9071ed03), Phase A, item 4. The signup +
// email-verify + connect-your-MCP screens render and route so the launch flow is
// reviewable end to end, but the account-creation half is DELIBERATELY NOT WIRED
// here. That is Phase B (loop e3af38bb), gated on the user-lifecycle ADR
// (sagacity-lead loop 7fe131ee, SR-4 founder-ratified) — it is a HARD boundary
// for this loop:
//   • do NOT re-enable public /auth/signup (membrane raises 403 by design,
//     record 4f92fe7d)
//   • do NOT build the atomic auto-provisioning saga (Cognito → org → community →
//     gang → corpus → claims → consumer-tier → tool-allowlist → discovery →
//     reconnect), productizing the Sheryl manual path (2c357f93 / ab6a2c7a)
//   • do NOT implement free-tier caps or the entitlement flag
//
// Everything account-creating funnels through this module so Phase B has ONE
// place to wire the real saga behind, and so the seam is impossible to miss.

// Master switch for the account-creation path. Stays false until Phase B wires
// the provisioning saga. The signup screen reads this: when false it shows the
// "opens at launch" notice and offers a non-creating preview walk-through of the
// shell instead of calling the (intentionally absent) backend.
export const SIGNUP_ENABLED = false;

export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResult {
  // Email the verification step should display / the verify link is sent to.
  email: string;
}

/**
 * PHASE-B SEAM. The real implementation will call the membrane signup +
 * auto-provisioning saga and return once the account exists (pending email
 * verification). In Phase A it is intentionally not implemented — calling it
 * throws so no caller can accidentally believe an account was created.
 *
 * Phase B (loop e3af38bb) replaces this body with the real call and flips
 * SIGNUP_ENABLED to true.
 */
export async function provisionSignup(_req: SignupRequest): Promise<SignupResult> {
  throw new Error(
    "Account creation is not enabled yet (Phase B — loop e3af38bb, gated on the " +
      "user-lifecycle ADR). This is the onboarding shell preview.",
  );
}

// Email-verification seam (Phase B). The verify screen renders the post-signup
// state and a deep-linkable URL (/verify-email?email=…). Real token confirmation
// against Cognito + propagating email_verified=true (the noodal-api gotcha
// 3794a78a flagged in addendum 4f2c0b96) lands in Phase B.
export const EMAIL_VERIFY_ENABLED = false;

// Public "Sign in" affordance visibility. Hidden across the public marketing /
// F&F surface until the official Free tier launch: at an invite-only, MCP-first
// launch a prominent sign-in over-promises the (still-early) web workspace, and
// invitees reach their noodal through their own MCP client, not this app. Sign-in
// still works by direct URL — this only gates the visible links. Flip to true at
// Free tier launch (alongside SIGNUP_ENABLED).
export const PUBLIC_SIGNIN_ENABLED = false;
