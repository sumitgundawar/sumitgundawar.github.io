import { useRef, useState } from "react";
import { trackClick } from "@/lib/hooks";
import { getTurnstileToken, loadTurnstile } from "@/lib/turnstile";
import { API } from "@/lib/api";

/* The signup, shown where someone has just got something out of the site.
 *
 * On the profile page the form sits near the bottom, which is fine for a person
 * who came looking for it and useless for everyone else. Asking after three
 * answered checks, or after a finished architecture, asks someone who has
 * demonstrated the material is worth their time. That is the whole argument for
 * placement: same form, better moment.
 *
 * Inline, never a modal. An overlay that interrupts reading to ask for an email
 * is the thing people install blockers for, and the material here is the reason
 * they came.
 *
 * Dismissal is remembered. Asking twice is worse than never asking, and someone
 * who said no is not a lead to re-approach in three topics' time.
 */

const KEY = "sg-newsletter-v1";

type Seen = { dismissed?: boolean; joined?: boolean };

function read(): Seen {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Seen;
  } catch {
    return {};
  }
}

function write(v: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v }));
  } catch {
    /* private browsing: it will ask again next visit, which is acceptable */
  }
}

export function NewsletterPrompt({ context, line }: { context: string; line: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [email, setEmail] = useState("");
  /* Bot filters, checked server-side. `company` is a honeypot that stays empty
     for anyone real, and renderedAt lets the server reject a submission that
     arrived faster than a person could read the sentence above it. Resend's free
     tier is 100 sends a day, so scripted signups cost real delivery. */
  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());
  /* The invisible Turnstile widget renders into this. It is only mounted
     once someone touches the form, so the third-party script is never
     fetched for the many visitors who never sign up. */
  const capture = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(() => {
    const s = read();
    return Boolean(s.dismissed || s.joined);
  });
  const [message, setMessage] = useState("");

  if (hidden) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    trackClick("newsletter_signup", { context });
    try {
      const turnstileToken = capture.current ? await getTurnstileToken(capture.current) : null;
      const res = await fetch(`${API}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: context, company, renderedAt, turnstileToken }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setState("error");
        setMessage(j.error ?? "Could not sign you up just now.");
        return;
      }
      write({ joined: true });
      setState("done");
    } catch {
      setState("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  return (
    <aside
      className="my-8 p-5 sm:p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--hair-strong)" }}
      aria-label="Newsletter"
    >
      {state === "done" ? (
        <p className="mono text-[length:var(--fs-input)]" style={{ color: "var(--accent)" }} role="status">
          You are on the list. A welcome note is on its way.
        </p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <p className="text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text)" }}>
              {line}
            </p>
            <button
              type="button"
              onClick={() => {
                write({ dismissed: true });
                setHidden(true);
                trackClick("newsletter_dismiss", { context });
              }}
              aria-label="Dismiss"
              className="mono text-[length:var(--fs-input)] shrink-0 min-h-[44px] min-w-[44px]"
              style={{ color: "var(--c-text-dim)" }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2 min-w-0">
            {/* Hidden from people and from assistive technology, so nobody real
                can fill it in by accident: aria-hidden and tabIndex -1 keep it
                out of the reading order, and display:none keeps it out of the
                layout. Only a script that fills every input will touch it. */}
            <div aria-hidden="true" style={{ display: "none" }}>
              <label htmlFor={`np-co-${context}`}>Company</label>
              <input
                id={`np-co-${context}`}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <label className="sr-only" htmlFor={`np-${context}`}>
              Email address
            </label>
            <input
              id={`np-${context}`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => void loadTurnstile()}
              disabled={state === "busy"}
              placeholder="you@example.com"
              autoComplete="email"
              className="mono text-[length:var(--fs-input)] flex-1 min-w-0 px-3 min-h-[44px]"
              style={{ background: "var(--surface-2)", border: "1px solid var(--hair-strong)", color: "var(--c-text)" }}
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
          <div ref={capture} aria-hidden="true" />

          {state === "error" && (
            <p className="mono text-[length:var(--fs-label)] mt-2" style={{ color: "var(--warn)" }} role="alert">
              {message}
            </p>
          )}
          <p className="mono text-[length:var(--fs-micro)] mt-3" style={{ color: "var(--c-text-dim)" }}>
            Unsubscribe in one click, from any email.
          </p>
        </>
      )}
    </aside>
  );
}
