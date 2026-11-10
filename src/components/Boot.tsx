import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { advance, markBooted, prefersStill, subscribe, SPRING } from "@/lib/motion";

const WAITING = { tension: 10, friction: 30 };
const READY = { tension: 170, friction: 26 };
const CLEAR = { tension: 140, friction: 26 };
const CLEAR_MS = 430;
const PAUSE_MS = 240;

export function Boot() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const automated =
      typeof navigator !== "undefined" &&
      navigator.webdriver &&
      !new URLSearchParams(window.location.search).has("boot");
    if (prefersStill() || automated) {
      markBooted();
      setGone(true);
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    const count = { value: 0, velocity: 0 };
    const labels = { value: 1, velocity: 0 };
    const lift = { value: 0, velocity: 0 };

    let ready = false;
    let clearedAt = 0;
    let liftAt = 0;
    let last = performance.now();

    const assets = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = "/sumit-cutout.webp";
      }),
    ]);
    void assets.then(() => {
      ready = true;
    });

    const stop = subscribe((time) => {
      const delta = Math.max(0, time - last);
      last = time;

      advance(count, ready ? 100 : 70, ready ? READY : WAITING, delta, 0.05);
      setPercent(Math.min(100, Math.round(count.value)));

      if (count.value >= 99.4 && !clearedAt) clearedAt = time;
      if (clearedAt) {
        advance(labels, 0, CLEAR, delta, 0.001);
        const panel = host.querySelector<HTMLElement>("[data-boot-content]");
        if (panel) panel.style.opacity = `${labels.value}`;
        if (panel) panel.style.transform = `translateY(${(1 - labels.value) * -12}px)`;
      }

      if (clearedAt && time - clearedAt >= CLEAR_MS + PAUSE_MS) {
        if (!liftAt) {
          liftAt = time;
          markBooted();
        }
        const settled = advance(lift, -100, SPRING.REVEAL, delta, 0.05);
        host.style.transform = `translateY(${lift.value}%)`;
        if (settled) {
          stop();
          setGone(true);
        }
      }
    });

    return () => {
      stop();
      markBooted();
    };
  }, []);

  if (gone) return null;

  return createPortal(
    <div ref={hostRef} className="boot" role="status" aria-label="Loading">
      <div className="boot-inner" data-boot-content>
        <span className="boot-name">Sumit Gundawar</span>
        <span className="boot-count tnum">
          {percent}
          <span className="boot-pc">%</span>
        </span>
      </div>
      <div className="boot-meter" aria-hidden>
        <span className="boot-meter-fill" style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
    </div>,
    document.body,
  );
}
