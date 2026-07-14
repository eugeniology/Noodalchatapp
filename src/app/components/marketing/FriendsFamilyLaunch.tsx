import { Link } from "react-router";
import { MarketingPage, serif, mono } from "./MarketingChrome";
import { NotifyMeForm } from "./NotifyMeForm";
import { PUBLIC_SIGNIN_ENABLED } from "../../lib/onboarding";

// Friends & Family launch gate. While Noodal is invite-only, the public
// "Get started free" / "Start your free noodal" CTAs (and the /signup route)
// redirect here instead of the Phase-A signup shell: an honest invite-only
// explainer plus a notify-me capture. Reverts to the real signup flow at
// public launch (see main.tsx — the /signup route).

export function FriendsFamilyLaunch() {
  return (
    <MarketingPage>
      <section className="mx-auto max-w-xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-purple)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">
          Friends &amp; Family · Invite only
        </p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[42px]">
          We're letting people in a few at a time.
        </h1>
        <p className="mt-4 text-[18px] leading-relaxed text-[#54515d]">
          Noodal is in a Friends and Family launch right now: invite only, so we can get the
          experience right with a small first circle before we open it up. If you'd like to be
          there when the doors open, leave your email and we'll reach out the moment there's a spot.
        </p>

        <div className="mt-8 rounded-[16px] border p-6" style={{ borderColor: "#ece8df", background: "var(--noo-paper)" }}>
          <p style={{ ...mono, color: "var(--noo-ink)" }} className="text-[12px] uppercase tracking-[0.12em]">
            Get notified
          </p>
          <NotifyMeForm source="friends-family-launch" />
        </div>

        {PUBLIC_SIGNIN_ENABLED && (
          <p className="mt-6 text-[13px] text-[#9c98a8]">
            Already have an invite?{" "}
            <Link to="/" className="underline underline-offset-4" style={{ color: "var(--noo-purple)" }}>
              Sign in
            </Link>
            .
          </p>
        )}
      </section>
    </MarketingPage>
  );
}

export default FriendsFamilyLaunch;
