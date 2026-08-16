import { useState } from "react";
import { trackClick } from "@/lib/hooks";

/* Newsletter signup.
 *
 * Double opt-in, so nothing is sent until the address is confirmed. That is
 * partly the law here, since UK PECR treats marketing email as requiring
 * consent, and partly that a confirmed address is the only kind worth having:
 * it proves the address exists and that its owner asked for this.
 *
 * The consent line is written out rather than implied, and there is no
 * pre-ticked box, because a pre-ticked box is not consent under UK GDPR. The
 * promise about frequency is deliberately modest: it is easier to keep.
 */

const API = "https://site-agent-relay.sumitgundawar3.workers.dev";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    trackClick("newsletter_signup", {});
    try {
      const res = await fetch(`${API}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home" }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setState("error");
        setMessage(j.error ?? "Could not sign you up just now.");
        return;
      }
      setState("done");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  return (
    <section className="mt-14" aria-labelledby="newsletter-h">
      <div className="flex items-center flex-wrap gap-3 mb-5">
        <span aria-hidden className="inline-block shrink-0" style={{ width: 7, height: 7, background: "var(--cool)" }} />
        <h2
          id="newsletter-h"
          className="mono uppercase font-semibold"
          style={{ fontSize: "12px", letterSpacing: "0.14em", color: "var(--c-text-dim)" }}
        >
          newsletter
        </h2>
        <span className="h-px flex-1 min-w-8" style={{ background: "var(--hair)" }} />
      </div>

      <div className="max-w-[36em]">
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          Occasional writing on building systems that survive production: what broke, why, and what the
          fix actually cost. No more than once a month, and nothing else.
        </p>

        {state === "done" ? (
          <p className="mono text-[13px] mt-4" style={{ color: "var(--accent)" }} role="status">
            Check your inbox and confirm. Nothing is sent until you do.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2 min-w-0">
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === "busy"}
              placeholder="you@example.com"
              autoComplete="email"
              className="mono text-[13px] flex-1 min-w-0 px-3 min-h-[44px]"
              style={{ background: "var(--surface)", border: "1px solid var(--hair-strong)", color: "var(--c-text)" }}
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="mono text-[12px] uppercase tracking-[0.08em] px-4 min-h-[44px] shrink-0"
              style={{ border: "1px solid var(--hair-strong)", background: "var(--surface-2)", color: "var(--c-text)" }}
            >
              {state === "busy" ? "…" : "subscribe"}
            </button>
          </form>
        )}

        {state === "error" && (
          <p className="mono text-[12px] mt-2" style={{ color: "var(--warn)" }} role="alert">
            {message}
          </p>
        )}

        <p className="mono text-[11px] mt-3 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          You will get one email asking you to confirm. Unsubscribe from any email, in one click. Your
          address is stored to send this and nothing else, and is never passed on.
        </p>
      </div>
    </section>
  );
}
