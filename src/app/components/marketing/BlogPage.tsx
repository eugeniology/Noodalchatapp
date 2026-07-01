import { useState } from "react";
import { MarketingPage, serif, mono } from "./MarketingChrome";

// The Noodal blog: "Notes from building the memory layer." Cut 1 ships the shell;
// real content arrives via the content pipeline (founder-deferred). Seeded with the
// design's "what changed" build-notes, plus one "use case" seed post, so the
// layout, tag filter, and empty state are reviewable.
//
// Categories: "What Changed" (build notes) and "Use Cases" (per-industry
// writeups, e.g. "How a builder tracks a job with Noodal"). More categories can
// be added the same way; the filter pills are derived from whatever tags the
// posts carry, so no separate config to keep in sync.

type Tag = "WHAT CHANGED" | "USE CASE";
type Post = { date: string; tag: Tag; title: string; excerpt: string };

const TAG_COLOR: Record<Tag, { bg: string; fg: string }> = {
  "WHAT CHANGED": { bg: "var(--noo-purple-tint)", fg: "var(--noo-purple)" },
  "USE CASE": { bg: "var(--noo-green-tint)", fg: "var(--noo-green)" },
};

const POSTS: Post[] = [
  {
    date: "JUN 17",
    tag: "WHAT CHANGED",
    title: "A soft nudge, not a gate",
    excerpt:
      "Your noodal works the moment you sign up. After 24h unverified, writing pauses but reading stays open, and nothing is deleted.",
  },
  {
    date: "JUN 15",
    tag: "WHAT CHANGED",
    title: "Signup is now open & self-serve",
    excerpt: "No waitlist, no invite code. Sign up and your noodal is ready.",
  },
  {
    date: "JUN 10",
    tag: "USE CASE",
    title: "How a builder tracks a job with Noodal",
    excerpt: "Ask how far a project has come and get the current numbers, not a guess: square footage, budget, change orders, all remembered.",
  },
  {
    date: "JUN 02",
    tag: "WHAT CHANGED",
    title: "We shipped the free tier MCP-first",
    excerpt: "Your noodal works with Claude, Cursor, ChatGPT, any MCP client. Paste one URL. No keys.",
  },
];

const FILTERS = ["All", ...Array.from(new Set(POSTS.map((p) => p.tag)))] as const;

export function BlogPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const posts = filter === "All" ? POSTS : POSTS.filter((p) => p.tag === filter);

  return (
    <MarketingPage>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-terracotta)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">The Noodal blog</p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[44px]">
          Notes from building the memory layer.
        </h1>

        <div className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={
                f === filter
                  ? { background: "var(--noo-purple)", color: "#fff" }
                  : { background: "#fff", color: "var(--noo-ink)", border: "1px solid #dcd9d2" }
              }
              className="rounded-full px-4 py-1.5 text-[13px] font-medium"
            >
              {f === "All" ? "All" : f === "WHAT CHANGED" ? "What Changed" : "Use Cases"}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="mt-14 rounded-[16px] border p-12 text-center" style={{ borderColor: "#ece8df", background: "var(--noo-paper)" }}>
            <p style={{ ...serif, color: "var(--noo-ink)" }} className="text-[20px] font-medium">No posts yet.</p>
            <p className="mt-2 text-[15px] text-[#54515d]">The first notes are on the way.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <a key={p.title} href="#" className="block rounded-[16px] border p-7 transition hover:shadow-sm" style={{ borderColor: "#ece8df" }}>
                <div className="flex items-center gap-3">
                  <span style={mono} className="text-[12px] text-[#7a7788]">{p.date}</span>
                  <span style={{ ...mono, background: TAG_COLOR[p.tag].bg, color: TAG_COLOR[p.tag].fg }} className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em]">
                    {p.tag}
                  </span>
                </div>
                <h3 style={{ ...serif, color: "var(--noo-ink)" }} className="mt-3 text-[22px] font-medium">{p.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-[#54515d]">{p.excerpt}</p>
                <span style={{ color: "var(--noo-purple)" }} className="mt-4 inline-block text-[14px] underline underline-offset-4">Read the post&nbsp;→</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </MarketingPage>
  );
}

export default BlogPage;
