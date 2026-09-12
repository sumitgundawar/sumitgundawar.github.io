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

const TARGET_KEYS = ["title", "channel", "topic", "view", "context", "action", "target", "label", "show"];

export function trackClick(event: string, params: Record<string, string> = {}): void {
  const key = TARGET_KEYS.find((k) => params[k]);
  const target = key ? params[key] : undefined;
  trackClickEvent(event, target, typeof window !== "undefined" ? window.location.pathname : undefined);
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

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
      send();
    };
  }, [path, topicId]);
}

export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    const full = title ? `${title} \u00b7 ${SITE_NAME}` : SITE_NAME;
    document.title = full;
    if (description) setMeta("name", "description", description);
    setSocialMeta(full, description);
  }, [title, description]);
}

export function setSocialMeta(title: string, description?: string): void {
  setMeta("property", "og:title", title);
  setMeta("name", "twitter:title", title);
  if (description) {
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:description", description);
  }
}

const ORIGIN = "https://sumitgundawar.com";

export function setCanonical(pathname: string): void {
  const path = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const href = ORIGIN + path;

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);

  setMeta("property", "og:url", href);
}

export function useCanonical(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    setCanonical(pathname);
  }, [pathname]);
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
