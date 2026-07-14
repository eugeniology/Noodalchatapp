import { Link } from "react-router";
import { MarketingPage, serif, mono } from "./MarketingChrome";

// FAQ — "Questions, answered." Copy grounded in the product (MCP-first, BYO-model,
// free tier, privacy, Founding Circle). Subject to a CMO copy pass.

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a noodal?",
    a: "Working memory for one subject — here, you. Every decision, note, and session turn lives in your noodal, searchable from any future session. The context that used to vanish now stays.",
  },
  {
    q: "How do I connect it?",
    a: "Paste one URL into your MCP client — Claude, Cursor, ChatGPT, OpenClaw, or anything that speaks MCP. Your own model does the thinking; you're remembering in two minutes.",
  },
  {
    q: "Is it really free?",
    a: "Yes. One noodal costs nothing — your model does the work, and we don't charge for inference. You pay only when you want many noodals that compound and run tasks for you.",
  },
  {
    q: "Whose model runs it?",
    a: "Yours. Bring your own engine and keep it where it is — your provider, your bill, your data. We sit alongside your model, not in front of it.",
  },
  {
    q: "Is my data private?",
    a: "Every noodal is isolated by default. What you put in stays yours — never sold, never mined, never used to train a model. Export everything as JSON anytime; delete it and it's gone for good.",
  },
  {
    q: "What's the Founding Circle?",
    a: "Early-access pricing for the first cohort: Noodals at half off — $6/mo or $60/yr, locked in. It's a cohort cap, not a calendar sale.",
  },
  {
    q: "What comes after the free tier?",
    a: "Noodals — many noodals that compound, communicate, and run tasks while you're away. For your family, business, projects, or studies. Coming this fall.",
  },
];

export function FaqPage() {
  return (
    <MarketingPage>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-green)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">What's this about?</p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[44px]">Questions, answered.</h1>

        <div className="mt-10 grid gap-x-12 md:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="border-t py-7" style={{ borderColor: "#ece8df" }}>
              <h3 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[20px] font-medium">{f.q}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#54515d]">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[16px] border p-7 text-center" style={{ borderColor: "#ece8df", background: "var(--noo-paper)" }}>
          <p style={{ ...serif, color: "var(--noo-ink)" }} className="text-[20px] font-medium">Still curious?</p>
          <p className="mt-2 text-[15px] text-[#54515d]">A real person reads every message.</p>
          <Link to="/contact" style={{ color: "var(--noo-purple)" }} className="mt-3 inline-block text-[15px] underline underline-offset-4 hover:opacity-70">
            Send it to the founder&nbsp;→
          </Link>
        </div>
      </section>
    </MarketingPage>
  );
}

export default FaqPage;
