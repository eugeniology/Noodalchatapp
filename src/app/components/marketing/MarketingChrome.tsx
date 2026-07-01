import { Link, useNavigate } from "react-router";

// Shared marketing chrome (banner + nav + footer) for the noodals public pages.
// Tokens come from styles/fonts.css (var(--noo-*) / fonts).

export const serif = { fontFamily: "var(--font-fraunces)" } as const;
export const mono = { fontFamily: "var(--font-plex-mono)" } as const;
export const sans = { fontFamily: "var(--font-plex-sans)" } as const;

const NAV = [
  { label: "Product", to: "/#product" },
  { label: "Use Cases", to: "/#use-cases" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Setup", to: "/#setup" },
  { label: "Blog", to: "/blog" },
  { label: "FAQ", to: "/faq" },
  { label: "About", to: "/#product" },
  { label: "Contact", to: "/contact" },
];

export function MarketingHeader() {
  const navigate = useNavigate();
  return (
    <>
      <div style={{ background: "var(--noo-paper)", borderBottom: "1px solid #ece8df" }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-3 px-6 py-2.5 text-center">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--noo-green-light)" }} />
          <p style={{ ...mono, color: "var(--noo-ink)" }} className="text-[12px] tracking-tight">
            Your first noodal is free, forever. Additional noodals are $1/mo.
          </p>
          <a href="/#pricing" style={{ ...mono, color: "var(--noo-purple)" }} className="text-[12px] underline underline-offset-4 hover:opacity-70">
            See pricing&nbsp;→
          </a>
        </div>
      </div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: "var(--noo-purple)" }} />
          <span style={{ ...serif, color: "var(--noo-ink)" }} className="text-[22px] font-semibold tracking-tight">noodal</span>
        </Link>
        <div className="flex items-center gap-7">
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) =>
              n.to.startsWith("/#") ? (
                <a key={n.label} href={n.to} style={sans} className="text-[15px] text-[#54515d] hover:text-[var(--noo-ink)]">{n.label}</a>
              ) : (
                <Link key={n.label} to={n.to} style={sans} className="text-[15px] text-[#54515d] hover:text-[var(--noo-ink)]">{n.label}</Link>
              ),
            )}
          </nav>
          <button onClick={() => navigate("/signup")} style={{ background: "var(--noo-purple)" }} className="rounded-[10px] px-4 py-2.5 text-[14px] font-medium leading-tight text-white hover:opacity-90">
            Get started free
          </button>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer style={{ background: "var(--noo-paper)" }} className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--noo-purple)" }} />
          <span style={{ ...serif, color: "var(--noo-ink)" }} className="text-[18px] font-semibold">noodal</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          {NAV.map((n) =>
            n.to.startsWith("/#") ? (
              <a key={n.label} href={n.to} style={mono} className="text-[12px] text-[#7a7788] hover:text-[var(--noo-ink)]">{n.label}</a>
            ) : (
              <Link key={n.label} to={n.to} style={mono} className="text-[12px] text-[#7a7788] hover:text-[var(--noo-ink)]">{n.label}</Link>
            ),
          )}
        </nav>
        <p style={mono} className="text-[12px] text-[#7a7788]">The story that stays true as you change.</p>
      </div>
    </footer>
  );
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...sans, background: "#fff", color: "var(--noo-text)" }} className="flex min-h-screen w-full flex-col overflow-x-hidden">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
