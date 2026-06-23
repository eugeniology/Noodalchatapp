import { MarketingPage, serif, mono } from "./MarketingChrome";

// The Noodal blog — "Notes from building the memory layer." Cut 1 ships the shell;
// real content arrives via the content pipeline (founder-deferred). Seeded with the
// design's "what changed" build-notes so the layout + empty state are reviewable.

type Post = { date: string; tag: string; title: string; excerpt: string };

const POSTS: Post[] = [
  {
    date: "JUN 17",
    tag: "WHAT CHANGED",
    title: "A soft nudge, not a gate",
    excerpt:
      "Your noodal works the moment you sign up. After 24h unverified, writing pauses but reading stays open — and nothing is deleted.",
  },
  {
    date: "JUN 15",
    tag: "WHAT CHANGED",
    title: "Signup is now open & self-serve",
    excerpt: "No waitlist, no invite code. Sign up and your noodal is ready.",
  },
  {
    date: "JUN 02",
    tag: "WHAT CHANGED",
    title: "We shipped the free tier MCP-first",
    excerpt: "Your noodal works with Claude, Cursor, ChatGPT — any MCP client. Paste one URL. No keys.",
  },
];

export function BlogPage() {
  return (
    <MarketingPage>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-terracotta)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">The Noodal blog</p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[44px]">
          Notes from building the memory layer.
        </h1>

        {POSTS.length === 0 ? (
          <div className="mt-14 rounded-[16px] border p-12 text-center" style={{ borderColor: "#ece8df", background: "var(--noo-paper)" }}>
            <p style={{ ...serif, color: "var(--noo-ink)" }} className="text-[20px] font-medium">No posts yet.</p>
            <p className="mt-2 text-[15px] text-[#54515d]">The first notes are on the way.</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {POSTS.map((p) => (
              <a key={p.title} href="#" className="block rounded-[16px] border p-7 transition hover:shadow-sm" style={{ borderColor: "#ece8df" }}>
                <div className="flex items-center gap-3">
                  <span style={mono} className="text-[12px] text-[#7a7788]">{p.date}</span>
                  <span style={{ ...mono, background: "var(--noo-purple-tint)", color: "var(--noo-purple)" }} className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.1em]">
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
