import { useEffect, useRef } from "react";
import { advance, onEnter, prefersStill, subscribe, SPRING } from "@/lib/motion";
import { kpis } from "@/data/content";

export function Numbers() {
  const listRef = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const host = listRef.current;
    if (!host) return;
    const cells = Array.from(host.querySelectorAll<HTMLElement>("[data-cell]"));
    if (!cells.length) return;

    const settle = (el: HTMLElement) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    };

    if (prefersStill()) {
      cells.forEach(settle);
      return;
    }

    let stop: (() => void) | null = null;
    const begin = () => {
      const started = performance.now();
      const states = cells.map(() => ({ value: 0, velocity: 0 }));
      let last = started;
      stop = subscribe((time) => {
        const delta = Math.max(0, time - last);
        last = time;
        let done = true;
        for (let i = 0; i < cells.length; i += 1) {
          if (time - started < i * 110) {
            done = false;
            continue;
          }
          if (!advance(states[i], 1, SPRING.ROW, delta, 0.001)) done = false;
          const v = states[i].value;
          cells[i].style.opacity = `${v}`;
          cells[i].style.transform = `translateY(${(1 - v) * 18}px)`;
        }
        if (done) {
          cells.forEach(settle);
          stop?.();
          stop = null;
        }
      });
    };

    const off = onEnter(host, begin);
    return () => {
      off();
      stop?.();
    };
  }, []);

  return (
    <dl ref={listRef} className="numbers">
      {kpis.map((kpi) => (
        <div key={kpi.value} className="numbers-cell" data-cell style={{ opacity: 0 }}>
          <dd className="numbers-figure tnum">{kpi.value}</dd>
          <dt className="numbers-label">{kpi.label}</dt>
          <dd className="numbers-note">{kpi.note}</dd>
        </div>
      ))}
    </dl>
  );
}
