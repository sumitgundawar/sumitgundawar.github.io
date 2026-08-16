import { useEffect, useState } from "react";
import { NewsletterPrompt } from "./NewsletterPrompt";

/* The newsletter, once, on the way out.
 *
 * People arrive at a personal site to find out about a person, not to be
 * enrolled in something. A popup on arrival answers a question nobody asked and
 * is the fastest way to make a site feel like a funnel, so every condition here
 * exists to make sure this only appears to someone who has actually read
 * something and is leaving anyway.
 *
 * All four must hold:
 *   read for 45 seconds        a bounce is not an audience
 *   scrolled past a third      the headline alone is not interest
 *   a real intent to leave     cursor to the top edge, or the tab hidden
 *   never asked before         dismissal and signup are both remembered
 *
 * Desktop exit intent is the cursor leaving through the top of the viewport,
 * which means the address bar, a tab, or the close button. There is no cursor
 * on a phone, so there the signal is the tab being hidden, which is what
 * switching apps or closing looks like. Both are checked once and then the
 * listeners are removed: a prompt that reappears is worse than one that never
 * came.
 */

const KEY = "sg-newsletter-v1";
const MIN_DWELL_MS = 45_000;
const MIN_SCROLL = 0.33;

function alreadyHandled(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}") as { dismissed?: boolean; joined?: boolean };
    return Boolean(s.dismissed || s.joined);
  } catch {
    return false;
  }
}

export function ExitPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (alreadyHandled()) return;

    const started = Date.now();
    let deepest = 0;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) deepest = Math.max(deepest, window.scrollY / h);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const earned = () =>
      Date.now() - started > MIN_DWELL_MS && deepest > MIN_SCROLL && !alreadyHandled();

    const fire = () => {
      if (!earned()) return;
      setShow(true);
      cleanup();
    };

    // Desktop: the cursor leaving through the top edge, which is the address
    // bar, the tabs, or the close button. Leaving sideways is not an exit.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire();
    };
    // Touch: there is no cursor, so the equivalent signal is the tab going away.
    const onHide = () => {
      if (document.visibilityState === "hidden") fire();
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onHide);

    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onHide);
    }
    return cleanup;
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={() => setShow(false)}
      role="presentation"
    >
      {/* Clicking the backdrop closes it, and so does Escape via the dismiss
          button being focusable. Nothing here traps anybody. */}
      <div
        className="w-full max-w-[34em]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Newsletter"
      >
        <NewsletterPrompt
          context="exit"
          line="Before you go: I write occasionally about building systems that survive production, what broke, why, and what the fix actually cost. It is the same material as the rest of this site."
        />
      </div>
    </div>
  );
}
