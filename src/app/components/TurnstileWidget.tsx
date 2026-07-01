import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile bot-check widget. Renders via the imperative
// window.turnstile API (script loaded globally in index.html) rather than
// the data-attribute auto-render approach, since imperative render/remove
// plays better with React's mount/unmount lifecycle.
//
// SITE_KEY is Cloudflare's published "always passes" TEST key
// (1x00000000000000000000AA) — it renders a real widget but always
// succeeds, proving nothing. Swap in a real site key from the Cloudflare
// dashboard (dash.cloudflare.com → Turnstile) before this goes live.
//
// This widget alone is not real bot protection: there's no backend yet to
// verify the token against Cloudflare's siteverify API, so today it's
// scaffolding for when one exists. Real protection = this widget + a
// server-side verify call once the Contact/Signup forms have a real backend.
const SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!!window.turnstile);

  useEffect(() => {
    if (window.turnstile) {
      setReady(true);
      return;
    }
    const id = setInterval(() => {
      if (window.turnstile) {
        setReady(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || widgetIdRef.current) return;
    const el = containerRef.current;
    widgetIdRef.current = window.turnstile!.render(el, {
      sitekey: SITE_KEY,
      callback: onVerify,
    });
    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return <div ref={containerRef} />;
}
