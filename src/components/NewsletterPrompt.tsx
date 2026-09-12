import { useRef, useState } from "react";
import { trackClick } from "@/lib/hooks";
import { getTurnstileToken, loadTurnstile } from "@/lib/turnstile";
import { API } from "@/lib/api";

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
  }
}

export function NewsletterPrompt({ context, line }: { context: string; line: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [email, setEmail] = useState("");

  const [company, setCompany] = useState("");
  const [renderedAt] = useState(() => Date.now());

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
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule-3)" }}
      aria-label="Newsletter"
    >
      {state === "done" ? (
        <p className="mono text-m1" style={{ color: "var(--accent)" }} role="status">
          You are on the list. A welcome note is on its way.
        </p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <p className="text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-hi)" }}>
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
              className="mono text-m1 shrink-0 min-h-[44px] min-w-[44px]"
              style={{ color: "var(--text-mid)" }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2 min-w-0">

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
              className="mono text-m1 flex-1 min-w-0 px-3 min-h-[44px]"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule-3)", color: "var(--text-hi)" }}
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

          {state === "error" && (
            <p className="mono text-m2 mt-2" style={{ color: "var(--warn)" }} role="alert">
              {message}
            </p>
          )}
          <p className="mono text-t3 mt-3" style={{ color: "var(--text-mid)" }}>
            Unsubscribe in one click, from any email.
          </p>
        </>
      )}
    </aside>
  );
}
