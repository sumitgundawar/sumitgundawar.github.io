import { useEffect, useRef } from "react";
import { advance, booted, onEnter, prefersStill, subscribe, SPRING, type SpringConfig } from "@/lib/motion";

type Props = {
  text: string;
  by?: "word" | "letter";
  stagger?: number;
  delay?: number;
  config?: SpringConfig;
  gap?: number;
  className?: string;
  unitClassName?: string;
  rootMargin?: string;
};

export function Reveal({
  text,
  by = "word",
  stagger = 110,
  delay = 0,
  config = SPRING.REVEAL,
  gap = 0.3,
  className,
  unitClassName,
  rootMargin,
}: Props) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const units = Array.from(host.querySelectorAll<HTMLElement>("[data-unit]"));
    if (!units.length) return;

    const lift = by === "word" ? 0.35 : 0.3;
    const settle = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    };

    if (prefersStill()) {
      units.forEach(settle);
      return;
    }

    let stop: (() => void) | null = null;
    const begin = () => {
      const started = performance.now();
      const states = units.map(() => ({ value: 0, velocity: 0 }));
      let last = started;
      stop = subscribe((time) => {
        const delta = Math.max(0, time - last);
        last = time;
        let settled = true;
        for (let i = 0; i < units.length; i += 1) {
          const begun = time - started >= delay + i * stagger;
          if (!begun) {
            settled = false;
            continue;
          }
          const done = advance(states[i], 1, config, delta, 0.001);
          if (!done) settled = false;
          const v = states[i].value;
          units[i].style.opacity = `${v}`;
          units[i].style.transform = `translateY(${(1 - v) * lift}em)`;
        }
        if (settled) {
          units.forEach(settle);
          stop?.();
          stop = null;
        }
      });
    };

    const off = onEnter(host, () => void booted.then(begin), rootMargin);
    return () => {
      off();
      stop?.();
    };
  }, [by, stagger, delay, config, text, rootMargin]);

  const parts = by === "word" ? text.split(/\s+/).filter(Boolean) : [...text];

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span
        ref={hostRef}
        aria-hidden
        className="rv"
        style={{ columnGap: `${gap}em` }}
      >
        {parts.map((part, i) => (
          <span
            key={`${part}-${i}`}
            data-unit
            data-allow-lowercase
            className={unitClassName}
            style={{ opacity: 0, transform: `translateY(${by === "word" ? 0.35 : 0.3}em)` }}
          >
            {part === " " ? "\u00a0" : part}
          </span>
        ))}
      </span>
    </span>
  );
}
