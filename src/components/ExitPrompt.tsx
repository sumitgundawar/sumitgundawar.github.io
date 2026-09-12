import { useEffect, useState } from "react";
import { NewsletterPrompt } from "./NewsletterPrompt";

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

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire();
    };

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

      <div
        className="w-full max-w-[34em]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Newsletter"
      >
        <NewsletterPrompt
          context="exit"
          line="Before you go: I write about building systems that survive production, what broke and what the fix cost. Same material as the rest of this site, sent when there is something worth sending."
        />
      </div>
    </div>
  );
}
