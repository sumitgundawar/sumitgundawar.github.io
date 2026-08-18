import { trackClickEvent, trackView } from "./api";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* Reveal an element once it scrolls into view. Returns a ref to attach. */
/* Reveals the children of a container one after another rather than as a block.
 *
 * A grid of twelve cards appearing at once reads as a page that was slow; the
 * same grid arriving over 300ms reads as a page that is assembling itself. The
 * delay is capped so a long list never leaves the last item waiting, and the
 * whole thing is skipped under reduced motion, where every child is simply
 * shown. Applied to the container, so adding a card needs no extra wiring. */
export function useStagger<T extends HTMLElement = HTMLDivElement>(step = 45, cap = 360) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    children.forEach((child, i) => {
      child.classList.add("reveal");
      if (reduced) {
        child.classList.add("in");
        return;
      }
      child.style.transitionDelay = `${Math.min(i * step, cap)}ms`;
    });
    if (reduced) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    children.forEach((child) => io.observe(child));
    return () => io.disconnect();
  }, [step, cap]);
  return ref;
}

/* Counts up to a number when it first comes into view.
 *
 * Only for figures that are worth noticing, and only once: a number that
 * re-animates every time it scrolls past is a distraction rather than an
 * accent. Returns the value to render, which is the final one immediately
 * under reduced motion so nothing depends on the animation having run. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const ref = useRef<HTMLElement | null>(null);
  void ref;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    setValue(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease out, so the number decelerates into its final value.
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* Sends a GA4 page_view on every route change, including the first. */
export function useAnalyticsPageview(): void {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
}

/* Records a click, to this site's own API first and to GA4 if it happens to be
 * there.
 *
 * The order matters and the early return is the bug that was here: this function
 * used to begin with `if (typeof window.gtag !== "function") return`, so every
 * click on the site was contingent on Google Analytics having loaded. Anyone
 * running a blocker, which is a large share of the audience this site is aimed
 * at, generated no record anywhere, and none of it ever reached the database the
 * weekly report is built from. The first-party call therefore happens first and
 * unconditionally, and gtag is the optional half.
 *
 * The most useful single field is which thing was clicked, not just that some
 * article was. The keys below are every key any call site actually passes, in
 * order of how specific they are: a title names the exact article or episode, a
 * channel names which contact link, and action distinguishes play from pause.
 * Guessing at names instead of reading the call sites is how the first version
 * of this recorded twelve events with an empty target.
 */
const TARGET_KEYS = ["title", "channel", "topic", "view", "context", "action", "target", "label", "show"];

export function trackClick(event: string, params: Record<string, string> = {}): void {
  const key = TARGET_KEYS.find((k) => params[k]);
  const target = key ? params[key] : undefined;
  trackClickEvent(event, target, typeof window !== "undefined" ? window.location.pathname : undefined);
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

/* Live clock, ticks every second. */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}


/* Page views with dwell, sent once per route change and once on the way out.
 *
 * Dwell is the number that makes views interpretable: a topic with many views
 * and three seconds of dwell was mis-sold by its title, and one with few views
 * and two minutes is buried. It is sent with keepalive so closing the tab, the
 * commonest way to end a visit, still reports it. visibilitychange rather than
 * unload, because unload has not been reliable on mobile Safari for years. */
export function usePageDwell(path: string, topicId?: string): void {
  useEffect(() => {
    const started = Date.now();
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      trackView(path, topicId, Date.now() - started);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      send(); // route change counts as leaving the page
    };
  }, [path, topicId]);
}

/* Per-page title and description.
 *
 * Every route shipped the same <title>, which is the one string a search result
 * shows as its headline and the one a shared link uses as its name. Identical
 * across four pages and thirty-four cards, it told a reader nothing about which
 * page they had found.
 *
 * Set from a component rather than in the router, because the title of a learn
 * card is not known until the card is. The prerenderer captures whatever the DOM
 * holds when it snapshots, so this reaches crawlers as a static title rather
 * than only after the bundle runs.
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    const full = title ? `${title} \u00b7 ${SITE_NAME}` : SITE_NAME;
    document.title = full;
    if (description) setMeta("name", "description", description);
    setSocialMeta(full, description);
  }, [title, description]);
}

/** Split out because /learn already builds its own title and description, in a
 *  form tuned for search, and two hooks writing different titles to the same
 *  page is worse than either. It calls this so its social tags agree with its
 *  own <title> rather than with a second opinion. */
export function setSocialMeta(title: string, description?: string): void {
  setMeta("property", "og:title", title);
  setMeta("name", "twitter:title", title);
  if (description) {
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:description", description);
  }
}

const SITE_NAME = "Sumit Gundawar";

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}
