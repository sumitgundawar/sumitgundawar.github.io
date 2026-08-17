import { useRef, useState } from "react";
import { trackClick } from "@/lib/hooks";
import { getTurnstileToken, loadTurnstile } from "@/lib/turnstile";
import { API } from "@/lib/api";

/* Newsletter signup.
 *
 * Single opt-in: subscribed on submit, no confirmation click. Valid consent
 * under UK GDPR provided the ask is explicit, unticked and unbundled, which is
 * why the consent line below is written out and there is no pre-ticked box.
 *
 * A welcome email still goes out. On a new sending domain a typo'd address
 * bounces, and bounces are what get a new sender blocked, so the first send is
 * also the check that the address is real.
 */


export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  /* Same two bot filters as the inline prompt, checked server-side. See
     NewsletterPrompt for why: Resend allows 100 sends a day, so scripted
     signups cost real delivery to people who actually asked. */
  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());
  /* The invisible Turnstile widget renders into this. It is only mounted
     once someone touches the form, so the third-party script is never
     fetched for the many visitors who never sign up. */
  const capture = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    trackClick("newsletter_signup", {});
    try {
      const turnstileToken = capture.current ? await getTurnstileToken(capture.current) : null;
      const res = await fetch(`${API}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home", company, renderedAt, turnstileToken }),
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
          style={{ fontSize: "var(--fs-label)", letterSpacing: "0.14em", color: "var(--c-text-dim)" }}
        >
          newsletter
        </h2>
        <span className="h-px flex-1 min-w-8" style={{ background: "var(--hair)" }} />
      </div>

      <div className="max-w-[36em]">
        <p className="text-[length:var(--fs-body)] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          Notes on building systems that survive production: what broke, and what the fix cost.
          Sent when there is something worth sending, and never for anything else.
        </p>

        {state === "done" ? (
          <p className="mono text-[length:var(--fs-input)] mt-4" style={{ color: "var(--accent)" }} role="status">
            You are on the list. A welcome note is on its way.
          </p>
        ) : (
          <>
          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2 min-w-0">
            {/* Honeypot: out of the layout and out of the reading order, so
                only a script that fills every input will touch it. */}
            <div aria-hidden="true" style={{ display: "none" }}>
              <label htmlFor="newsletter-company">Company</label>
              <input
                id="newsletter-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => void loadTurnstile()}
              disabled={state === "busy"}
              placeholder="you@example.com"
              autoComplete="email"
              className="mono text-[length:var(--fs-input)] flex-1 min-w-0 px-3 min-h-[44px]"
              style={{ background: "var(--surface)", border: "1px solid var(--hair-strong)", color: "var(--c-text)" }}
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em] px-4 min-h-[44px] shrink-0"
              style={{ border: "1px solid var(--hair-strong)", background: "var(--surface-2)", color: "var(--c-text)" }}
            >
              {state === "busy" ? "…" : "subscribe"}
            </button>
          </form>
          {/* Turnstile renders here, invisibly. Outside the form so a re-render
              of the fields cannot tear down a widget mid-verification. */}
          <div ref={capture} aria-hidden="true" />
          </>
        )}

        {state === "error" && (
          <p className="mono text-[length:var(--fs-label)] mt-2" style={{ color: "var(--warn)" }} role="alert">
            {message}
          </p>
        )}

        <p className="mono text-[length:var(--fs-micro)] mt-3 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          Unsubscribe from any email, in one click. Your address is stored to send this and nothing
          else, and is never passed on.
        </p>
      </div>
    </section>
  );
}
