import { useNavigate } from "react-router";

// Noodals marketing landing — Cut 1 of eng-noodals-consumer-marketing-surface-v1.
// Built code-as-source to the design at /dev/noodals-design/noodals2/Noodal.dc.html
// (build spec 26277eb4). Editorial hero direction (locked). Self-contained tokens
// (var(--noo-*) / fonts from styles/fonts.css) so it does not touch the app theme.

const serif = { fontFamily: "var(--font-fraunces)" } as const;
const mono = { fontFamily: "var(--font-plex-mono)" } as const;
const sans = { fontFamily: "var(--font-plex-sans)" } as const;

const NAV = ["Product", "Pricing", "Setup", "Blog", "FAQ", "About", "Contact"];

const OWNERSHIP = [
  {
    h: "Your model, your bill",
    p: "Your noodal runs on the AI you already use. We don't charge for inference — bring your own engine, keep it where it is.",
  },
  {
    h: "Yours to take, anytime",
    p: "Export the whole thing as plain markdown whenever you want. No lock-in, no hostage data.",
  },
  {
    h: "Never anyone's training data",
    p: "Your noodal is yours alone. It is never sold, never mined, never used to train someone else's model.",
  },
];

const STEPS = [
  { n: "01", h: "Your noodal goes live instantly", p: "Sign up free and your noodal exists in seconds. No waitlist, no setup call." },
  { n: "02", h: "Add noodal to your AI in one step", p: "Paste one URL into your MCP client. Your own model does the thinking." },
  { n: "03", h: "Talk, and it starts remembering", p: "Say hello and it begins keeping the story of now — across every session." },
];

const CONNECTORS = ["Claude", "ChatGPT", "Cursor", "OpenClaw", "Any MCP client"];

const TIERS = [
  {
    name: "Noodal",
    price: "$0",
    cadence: "forever free",
    blurb: "One noodal, focused on a very specific subject. In this case, you.",
    features: ["Cross-session memory via your MCP client", "Bring your own model", "Plain-markdown export, anytime"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Noodals",
    price: "$12",
    cadence: "/mo · or $120/yr",
    founders: "$6/mo or $60/yr for the Founding Circle",
    blurb: "Everything in Noodal, plus compounding memory across many noodals that talk to each other.",
    features: ["Multiple noodals", "Compounding cross-noodal memory", "Notes & inter-expert distillation", "Priority support"],
    cta: "Join the Founding Circle",
    highlight: true,
  },
  {
    name: "Enterprise Noodals",
    price: "Let's talk",
    cadence: "pricing TBD",
    blurb: "Always-on, managed runners, shared team memory, and on-prem options.",
    features: ["Managed always-on runners", "Team & shared memory", "SSO, audit, on-prem"],
    cta: "Contact us",
    highlight: false,
  },
];

export function MarketingLanding() {
  const navigate = useNavigate();
  const start = () => navigate("/signup");

  return (
    <div style={{ ...sans, background: "#ffffff", color: "var(--noo-text)" }} className="min-h-screen w-full overflow-x-hidden">
      {/* Top banner */}
      <div style={{ background: "var(--noo-paper)", borderBottom: "1px solid #ece8df" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-6 py-2.5 text-center">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--noo-green-light)" }} />
          <p style={{ ...mono, color: "var(--noo-ink)" }} className="text-[12px] tracking-tight">
            The Founding Circle is open — Noodals at half&nbsp;off for those who get here&nbsp;first
          </p>
          <button onClick={start} style={{ ...mono, color: "var(--noo-purple)" }} className="text-[12px] underline underline-offset-4 hover:opacity-70">
            See the offer&nbsp;→
          </button>
        </div>
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: "var(--noo-purple)" }} />
          <span style={{ ...serif, color: "var(--noo-ink)" }} className="text-[22px] font-semibold tracking-tight">
            noodal
          </span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`} style={sans} className="text-[15px] text-[#54515d] hover:text-[var(--noo-ink)]">
              {n}
            </a>
          ))}
        </nav>
        <button
          onClick={start}
          style={{ background: "var(--noo-purple)" }}
          className="rounded-[10px] px-4 py-2.5 text-[14px] font-medium leading-tight text-white hover:opacity-90"
        >
          Get started free
        </button>
      </header>

      {/* Hero — editorial */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
        <div>
          <p style={{ ...mono, color: "var(--noo-green)" }} className="mb-6 text-[12px] uppercase tracking-[0.14em]">
            Memory that compounds · Always free
          </p>
          <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[44px] font-semibold leading-[1.04] tracking-tight md:text-[60px]">
            Working memory for whatever you're in the middle&nbsp;of.
          </h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-[#54515d]">
            Intelligence without memory is just a very fast stranger. Your noodal keeps the story of now — and stays true as you change.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={start} style={{ background: "var(--noo-purple)" }} className="rounded-[12px] px-6 py-3.5 text-[15px] font-medium text-white hover:opacity-90">
              Start your free noodal&nbsp;→
            </button>
            <a href="#setup" style={{ color: "var(--noo-ink)" }} className="text-[15px] underline underline-offset-4 hover:opacity-70">
              See how it works
            </a>
          </div>
        </div>

        {/* Magic demo card */}
        <div className="rounded-[16px] border p-6 shadow-sm" style={{ borderColor: "#ece8df", background: "var(--noo-paper)" }}>
          <p style={{ ...mono, color: "var(--noo-muted)" }} className="mb-4 text-[11px] uppercase tracking-[0.12em]">
            in your AI tool
          </p>
          <div className="space-y-4 text-[15px]">
            <p className="text-[#54515d]"><span style={{ ...mono, color: "var(--noo-purple)" }} className="mr-2 text-[12px]">you</span>where did we land on the pricing?</p>
            <div className="rounded-[12px] p-4" style={{ background: "#fff", border: "1px solid #ece8df" }}>
              <p style={{ color: "var(--noo-ink)" }} className="leading-relaxed">
                Pro is <strong>$12/mo</strong> ($120/yr). You opened a first-cohort Founding Circle at half off ($6) — that changed two days ago from the earlier $6 base.
              </p>
            </div>
            <p style={{ ...mono, color: "var(--noo-green)" }} className="text-[12px]">↳ answered from the whole story, naming what changed</p>
          </div>
        </div>
      </section>

      {/* What is a noodal */}
      <section id="product" style={{ background: "var(--noo-paper)" }} className="border-y" >
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p style={{ ...mono, color: "var(--noo-terracotta)" }} className="mb-5 text-[12px] uppercase tracking-[0.14em]">What is a noodal?</p>
          <h2 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[30px] font-medium leading-snug md:text-[36px]">
            A noodal is working memory for one subject — in this case, you.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-[#54515d]">
            Ask where something stands and it answers from the whole story — naming what changed and bringing you up to now. It remembers, it stays true, and when things shift, it catches you up.
          </p>
        </div>
      </section>

      {/* Ownership */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 style={{ ...serif, color: "var(--noo-ink)" }} className="mb-12 text-center text-[32px] font-semibold tracking-tight md:text-[40px]">
          Your noodal is yours. Fully.
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {OWNERSHIP.map((c) => (
            <div key={c.h} className="rounded-[16px] border p-7" style={{ borderColor: "#ece8df" }}>
              <h3 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[20px] font-medium">{c.h}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#54515d]">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Setup */}
      <section id="setup" style={{ background: "var(--noo-ink)" }} className="text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p style={{ ...mono, color: "var(--noo-green-light)" }} className="mb-4 text-center text-[12px] uppercase tracking-[0.14em]">Two minutes to a noodal that remembers</p>
          <h2 style={{ ...serif }} className="mb-14 text-center text-[32px] font-semibold tracking-tight md:text-[40px]">Connect in two minutes.</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p style={{ ...mono, color: "var(--noo-purple-light)" }} className="text-[13px]">{s.n}</p>
                <h3 style={{ ...serif }} className="mt-3 text-[21px] font-medium">{s.h}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#b5b0d0]">{s.p}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            {CONNECTORS.map((c) => (
              <span key={c} style={{ ...mono }} className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/80">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-terracotta)" }} className="mb-3 text-center text-[12px] uppercase tracking-[0.14em]">Start free. Compound later.</p>
        <h2 style={{ ...serif, color: "var(--noo-ink)" }} className="mb-12 text-center text-[32px] font-semibold tracking-tight md:text-[40px]">Pricing</h2>
        <div className="grid items-start gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="flex h-full flex-col rounded-[18px] border p-7"
              style={{ borderColor: t.highlight ? "var(--noo-purple)" : "#ece8df", background: t.highlight ? "var(--noo-purple-tint)" : "#fff", borderWidth: t.highlight ? 2 : 1 }}
            >
              <h3 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[22px] font-semibold">{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold">{t.price}</span>
                <span className="text-[14px] text-[#7a7788]">{t.cadence}</span>
              </div>
              {t.founders && <p style={{ ...mono, color: "var(--noo-purple)" }} className="mt-1 text-[12px]">{t.founders}</p>}
              <p className="mt-4 text-[14px] leading-relaxed text-[#54515d]">{t.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14px] text-[#3f3c48]">
                    <span style={{ color: "var(--noo-green)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={start}
                className="mt-7 rounded-[12px] px-4 py-3 text-[14px] font-medium"
                style={t.highlight ? { background: "var(--noo-purple)", color: "#fff" } : { background: "#fff", color: "var(--noo-ink)", border: "1px solid #dcd9d2" }}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--noo-paper)" }} className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--noo-purple)" }} />
            <span style={{ ...serif, color: "var(--noo-ink)" }} className="text-[18px] font-semibold">noodal</span>
          </div>
          <p style={{ ...mono }} className="text-[12px] text-[#7a7788]">The story that stays true as you change.</p>
        </div>
      </footer>
    </div>
  );
}

export default MarketingLanding;
