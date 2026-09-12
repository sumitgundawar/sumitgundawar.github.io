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

    setTimeout(() => resolve(Boolean(window.turnstile)), 8000);
    document.head.appendChild(s);
  });
  return loading;
}

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
