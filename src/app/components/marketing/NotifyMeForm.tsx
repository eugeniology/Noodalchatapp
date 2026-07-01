import { useRef, useState } from "react";
import { BASE } from "../../lib/membraneBase";
import { useHoneypot } from "../../lib/useHoneypot";
import { TurnstileWidget } from "../TurnstileWidget";

// Gang tier's "notify me" / pre-order capture (loop 311b703c). Submits to
// membrane's POST /public/preorders first (a real backend the platform
// owns). Falls back to a silent Google Form bridge if that call fails for
// any reason — network error, or the backend not deployed yet — via a
// hidden iframe target so visitors never see Google's form UI or branding.
// Field IDs pulled directly from the live form's field-definition JSON on
// 2026-07-01 (docs.google.com/forms/d/e/1FAIpQLScHRtSvKPR1qlwdtf8MtdPBp-IL2ub2RsjgQHHKDUP1GthdLw).
// That form also has two optional fields ("How did you hear about us?",
// "Comments"); only Name and Email are required, so this submits just those
// two and leaves the rest blank.
const GFORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScHRtSvKPR1qlwdtf8MtdPBp-IL2ub2RsjgQHHKDUP1GthdLw/formResponse";
const GFORM_ENTRY_NAME = "entry.1473054664";
const GFORM_ENTRY_EMAIL = "entry.1929757461";
const IFRAME_NAME = "gform-notify-target";

export function NotifyMeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const { honeypotField, honeypotValue, isBot } = useHoneypot();
  const formRef = useRef<HTMLFormElement>(null);

  if (submitted) {
    return (
      <p className="mt-7 text-center text-[13px] text-[#54515d]">
        Thanks{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}. We'll email you when it's ready.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className="mt-7 space-y-2"
      action={GFORM_ACTION}
      method="POST"
      target={IFRAME_NAME}
      onSubmit={(e) => {
        // Always prevent the native submission here; we drive both paths
        // (membrane fetch or the Google Form fallback) ourselves below, so a
        // preventDefault() after an await would be too late — the browser
        // would already have fired the native submission by then.
        e.preventDefault();
        if (isBot()) return;

        (async () => {
          try {
            const res = await fetch(`${BASE}/public/preorders`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                desired_tier: "gang",
                source: "landing-page",
                turnstile_token: turnstileToken,
                honeypot: honeypotValue,
              }),
            });
            if (res.ok) {
              setSubmitted(true);
              return;
            }
          } catch {
            /* backend not reachable — fall through to the Google Form bridge */
          }
          // Fallback: submit the underlying form natively (bypassing React's
          // synthetic event) so it POSTs to GFORM_ACTION into the hidden
          // iframe using the form's own action/method/target attributes.
          formRef.current?.submit();
          setSubmitted(true);
        })();
      }}
    >
      <iframe name={IFRAME_NAME} style={{ display: "none" }} title="notify-me-submit" />
      {honeypotField}
      <input
        type="text"
        name={GFORM_ENTRY_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full Name"
        required
        className="w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none focus:border-[var(--noo-purple)]"
        style={{ borderColor: "#dcd9d2" }}
      />
      <input
        type="email"
        name={GFORM_ENTRY_EMAIL}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none focus:border-[var(--noo-purple)]"
        style={{ borderColor: "#dcd9d2" }}
      />
      <TurnstileWidget onVerify={setTurnstileToken} />
      <button
        type="submit"
        disabled={!turnstileToken}
        className="w-full rounded-[12px] px-4 py-3 text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--noo-purple)", color: "#fff" }}
      >
        Notify me of updates
      </button>
    </form>
  );
}
