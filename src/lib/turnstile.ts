/* Turnstile, loaded late and never in the way.
 *
 * The widget is invisible in managed mode: nobody clicks anything, and in the
 * normal case nobody sees anything. What it costs is a third-party script on a
 * page that is otherwise entirely self-contained, so it is not loaded with the
 * page. It loads the first time someone touches a signup field, which is the
 * only moment it can possibly be needed, and never at all for the large majority
 * of visitors who never go near the form.
 *
 * Every failure path resolves rather than rejects. The server treats a missing
 * token as acceptable and only refuses a token that is present and invalid, so a
 * blocked script, an offline moment or a slow load costs a real person nothing.
 * A newsletter that stops working because a challenge widget did not load is
 * worse than one that occasionally admits a bot, especially with a honeypot and
 * a timing check still standing behind it.
 */

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITEKEY = "0x4AAAAAAES60SZ216FlFQwT";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string | undefined;
      remove: (id: string) => void;
    };
  }
}

let loading: Promise<boolean> | null = null;

/** Loads the script once per page, whatever calls it. */
export function loadTurnstile(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SRC.split("?")[0]}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.turnstile)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(Boolean(window.turnstile));
    s.onerror = () => resolve(false);
    // A widget that never loads must not hold a form open indefinitely.
    setTimeout(() => resolve(Boolean(window.turnstile)), 8000);
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Renders an invisible widget into `el` and resolves with its token.
 *
 * Resolves with null on every failure, including timeout, because the caller's
 * job is to submit the form either way.
 */
export function getTurnstileToken(el: HTMLElement): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (t: string | null) => {
      if (settled) return;
      settled = true;
      resolve(t);
    };

    void loadTurnstile().then((ready) => {
      if (!ready || !window.turnstile) return done(null);
      try {
        window.turnstile.render(el, {
          sitekey: TURNSTILE_SITEKEY,
          size: "invisible",
          callback: (token: string) => done(token),
          "error-callback": () => done(null),
          "timeout-callback": () => done(null),
        });
      } catch {
        done(null);
      }
    });

    setTimeout(() => done(null), 9000);
  });
}
