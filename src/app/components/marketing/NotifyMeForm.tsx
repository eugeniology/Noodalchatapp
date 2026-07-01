import { useState } from "react";

// Silent Google Form bridge for the Gang tier's "notify me" capture. Submits
// via a hidden iframe target so visitors never see Google's form UI or
// branding; the response still lands in the underlying Google Sheet. Field
// IDs pulled directly from the live form's field-definition JSON on
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
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p className="mt-7 text-center text-[13px] text-[#54515d]">
        Thanks{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}. We'll email you when it's ready.
      </p>
    );
  }

  return (
    <form
      className="mt-7 space-y-2"
      action={GFORM_ACTION}
      method="POST"
      target={IFRAME_NAME}
      onSubmit={() => setSubmitted(true)}
    >
      <iframe name={IFRAME_NAME} style={{ display: "none" }} title="notify-me-submit" />
      <input
        type="text"
        name={GFORM_ENTRY_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        className="w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none focus:border-[var(--noo-purple)]"
        style={{ borderColor: "#dcd9d2" }}
      />
      <input
        type="email"
        name={GFORM_ENTRY_EMAIL}
        placeholder="Email"
        required
        className="w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none focus:border-[var(--noo-purple)]"
        style={{ borderColor: "#dcd9d2" }}
      />
      <button
        type="submit"
        className="w-full rounded-[12px] px-4 py-3 text-[14px] font-medium"
        style={{ background: "var(--noo-purple)", color: "#fff" }}
      >
        Notify me of updates
      </button>
    </form>
  );
}
