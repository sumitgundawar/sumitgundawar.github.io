import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/hooks";
import { getTurnstileToken, loadTurnstile } from "@/lib/turnstile";
import { API } from "@/lib/api";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());

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
        <span aria-hidden className="inline-block shrink-0" style={{ width: 7, height: 7, background: "var(--accent)" }} />
        <h2
          id="newsletter-h"
          className="mono uppercase font-semibold"
          style={{ fontSize: "var(--m2)", letterSpacing: "0.14em", color: "var(--text-mid)" }}
        >
          newsletter
        </h2>
        <span className="h-px flex-1 min-w-8" style={{ background: "var(--rule-2)" }} />
      </div>

      <div className="max-w-[36em]">
        <p className="text-t2 leading-relaxed" style={{ color: "var(--text-mid)" }}>
          Notes on building systems that survive production: what broke, and what the fix cost.
          Sent when there is something worth sending, and never for anything else.{" "}

          <Link to="/archive" className="link-underline" style={{ color: "var(--accent)" }}>
            Read past issues first
          </Link>
          .
        </p>

        {state === "done" ? (
          <p className="mono text-m1 mt-4" style={{ color: "var(--accent)" }} role="status">
            You are on the list. A welcome note is on its way.
          </p>
        ) : (
          <>
          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2 min-w-0">

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
              className="mono text-m1 flex-1 min-w-0 px-3 min-h-[44px]"
              style={{ background: "var(--ink-2)", border: "1px solid var(--rule-3)", color: "var(--text-hi)" }}
            />
            <button
              type="submit"
              disabled={state === "busy"}
              className="mono text-m2 uppercase tracking-[0.08em] px-4 min-h-[44px] shrink-0"
              style={{ border: "1px solid var(--rule-3)", background: "var(--ink-3)", color: "var(--text-hi)" }}
            >
              {state === "busy" ? "…" : "subscribe"}
            </button>
          </form>

          <div ref={capture} aria-hidden="true" />
          </>
        )}

        {state === "error" && (
          <p className="mono text-m2 mt-2" style={{ color: "var(--warn)" }} role="alert">
            {message}
          </p>
        )}

        <p className="mono text-t3 mt-3 leading-relaxed" style={{ color: "var(--text-mid)" }}>
          Unsubscribe from any email, in one click. Your address is stored to send this and nothing
          else, and is never passed on.
        </p>
      </div>
    </section>
  );
}
