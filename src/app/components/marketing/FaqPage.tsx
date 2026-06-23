import { Link } from "react-router";
import { MarketingPage, serif, mono } from "./MarketingChrome";

// FAQ — "Questions, answered." Copy grounded in the product (MCP-first, BYO-model,
// free tier, privacy, Founding Circle). Subject to a CMO copy pass.

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a noodal?",
    a: "Working memory for one subject — in this case, you. Every decision, note, and turn is captured in your noodal, searchable across every future session, and linked to where the real thing lives.",
  },
  {
    q: "How do I connect it?",
    a: "Paste one URL into your MCP client — Claude, ChatGPT, Cursor, OpenClaw, or any MCP tool. Your own model does the thinking; you're remembering in two minutes.",
  },
  {
    q: "Is it really free?",
    a: "Yes. The free noodal is genuinely free — your own model does the work, and we bill zero inference. You pay only when you want many noodals that compound and run tasks for you.",
  },
  {
    q: "Whose model runs it?",
    a: "Yours. Bring your own engine and keep it where it is — your provider, your bill, your data. We never charge for inference.",
  },
  {
    q: "Is my data private?",
    a: "Every noodal is isolated by default. What you put in stays yours alone — never sold, never mined, never used to train a model. Export the whole thing as JSON anytime; delete it and it's gone for good.",
  },
  {
    q: "What's the Founding Circle?",
    a: "Early-access pricing for the first cohort: Noodals Pro at half off — $6/mo or $60/yr, locked — for those who get here first. It's a cohort cap, not a calendar sale.",
  },
  {
    q: "What comes after the free tier?",
    a: "Noodals: many noodals that compound, communicate, and run tasks while you're away — for your family, business, projects, studies, or a new creative adventure. Coming this fall.",
  },
];

export function FaqPage() {
  return (
    <MarketingPage>
      <section className="mx-auto max-w-3xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-green)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">What's this about?</p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[44px]">Questions, answered.</h1>

        <div className="mt-12 divide-y" style={{ borderColor: "#ece8df" }}>
          {FAQS.map((f) => (
            <div key={f.q} className="py-7">
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
