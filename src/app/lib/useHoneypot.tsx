import { useRef, useState } from "react";

// Lightweight bot guard usable with or without a backend. Two checks: (1) a
// honeypot field real users never see but scripted bots often fill in blind,
// and (2) a minimum time-on-form, since scripted submitters tend to fire
// instantly on page load while real humans take at least a couple seconds to
// type. `honeypotValue` is exposed so callers with a real backend (Contact,
// NotifyMeForm) can forward it server-side for the same check there; forms
// with no backend yet (Signup's Phase-A shell) just use `isBot()` locally.
// Neither check is server-verified on its own, so this stops naive/scripted
// bots, not a targeted attacker replaying a real request body.
const MIN_FORM_SECONDS = 2;

export function useHoneypot() {
  const [honeypot, setHoneypot] = useState("");
  const mountedAt = useRef(Date.now());

  const isBot = () =>
    honeypot.trim() !== "" || Date.now() - mountedAt.current < MIN_FORM_SECONDS * 1000;

  const honeypotField = (
    <input
      type="text"
      name="company"
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
      autoComplete="off"
      tabIndex={-1}
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
    />
  );

  return { honeypotField, honeypotValue: honeypot, isBot };
}
