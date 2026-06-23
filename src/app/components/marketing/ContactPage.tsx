import { useState } from "react";
import { MarketingPage, serif, mono } from "./MarketingChrome";

// Contact / support — "no support queue, a real person reads every message."
// Cut 1: posts to the support endpoint later (311b703c: ticket -> loop -> SES).
// For now it shows the success state so the flow is reviewable.

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <MarketingPage>
      <section className="mx-auto max-w-xl px-6 py-20">
        <p style={{ ...mono, color: "var(--noo-terracotta)" }} className="mb-4 text-[12px] uppercase tracking-[0.14em]">A real person reads this</p>
        <h1 style={{ ...serif, color: "var(--noo-ink)" }} className="text-[34px] font-semibold leading-tight md:text-[42px]">
          There's no support queue.
        </h1>
        <p className="mt-4 text-[18px] leading-relaxed text-[#54515d]">
          A real person reads every message — and it's usually the founder. Email us directly, or use the form below.
        </p>

        {sent ? (
          <div className="mt-10 rounded-[16px] border p-8 text-center" style={{ borderColor: "var(--noo-green-light)", background: "var(--noo-green-tint)" }}>
            <p style={{ ...serif, color: "var(--noo-ink)" }} className="text-[22px] font-medium">Got it. It's in my inbox.</p>
            <p className="mt-2 text-[15px] text-[#54515d]">I'll be back to you soon.</p>
          </div>
        ) : (
          <form
            className="mt-10 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div>
              <label style={mono} className="mb-2 block text-[12px] uppercase tracking-[0.12em] text-[#7a7788]">Your email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@anywhere.com"
                className="w-full rounded-[12px] border px-4 py-3 text-[15px] outline-none focus:border-[var(--noo-purple)]"
                style={{ borderColor: "#dcd9d2" }}
              />
            </div>
            <div>
              <label style={mono} className="mb-2 block text-[12px] uppercase tracking-[0.12em] text-[#7a7788]">Your message</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="What's on your mind?"
                className="w-full resize-none rounded-[12px] border px-4 py-3 text-[15px] outline-none focus:border-[var(--noo-purple)]"
                style={{ borderColor: "#dcd9d2" }}
              />
            </div>
            <button type="submit" style={{ background: "var(--noo-purple)" }} className="rounded-[12px] px-6 py-3.5 text-[15px] font-medium text-white hover:opacity-90">
              Send it to the founder&nbsp;→
            </button>
          </form>
        )}
      </section>
    </MarketingPage>
  );
}

export default ContactPage;
