export type SpringConfig = { tension: number; friction: number };

export const SPRING = {
  REVEAL: { tension: 90, friction: 26 },
  ROW: { tension: 170, friction: 24 },
  SHEET: { tension: 190, friction: 26 },
  FIGURE: { tension: 200, friction: 24 },
  TYPE: { tension: 210, friction: 24 },
  COPY: { tension: 110, friction: 26 },
  NAME: { tension: 190, friction: 24 },
  TRIGGER: { tension: 140, friction: 30 },
} as const;

type Sub = { cb: (time: number) => void; rate: () => number; last: number };

const subs = new Set<Sub>();
let frame = 0;

const loop = (time: number) => {
  for (const sub of [...subs]) {
    if (time - sub.last > sub.rate()) {
      sub.last = time;
      sub.cb(time);
    }
  }
  frame = subs.size ? requestAnimationFrame(loop) : 0;
};

export function subscribe(cb: (time: number) => void, rate: () => number = () => 0) {
  const sub: Sub = { cb, rate, last: 0 };
  subs.add(sub);
  if (!frame) frame = requestAnimationFrame(loop);
  return () => {
    subs.delete(sub);
    if (!subs.size && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

export type SpringState = { value: number; velocity: number };

export function advance(
  state: SpringState,
  target: number,
  config: SpringConfig,
  deltaMs: number,
  precision = 0.01,
) {
  const steps = Math.min(deltaMs, 64);
  for (let i = 0; i < steps; i += 1) {
    const spring = -config.tension * 0.000001 * (state.value - target);
    const damper = -config.friction * 0.001 * state.velocity;
    state.velocity += spring + damper;
    state.value += state.velocity;
  }
  if (Math.abs(state.velocity) < precision && Math.abs(target - state.value) < precision) {
    state.value = target;
    state.velocity = 0;
    return true;
  }
  return false;
}

let releaseBoot: (() => void) | null = null;

export const booted = new Promise<void>((resolve) => {
  releaseBoot = resolve;
});

export function markBooted() {
  releaseBoot?.();
  releaseBoot = null;
}

if (typeof window !== "undefined") {
  window.setTimeout(markBooted, 2600);
}

export const prefersStill = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function onEnter(
  element: Element,
  run: () => void,
  rootMargin = "0% 0% -18% 0%",
) {
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      run();
    },
    { rootMargin },
  );
  io.observe(element);
  return () => io.disconnect();
}

export function scrollProgress(rect: DOMRect, start: string, end: string, viewport: number) {
  const poses: Record<string, number> = {
    top_top: rect.top,
    center_top: rect.top + rect.height / 2,
    bottom_top: rect.bottom,
    top_bottom: rect.top - viewport,
    center_bottom: rect.top + rect.height / 2 - viewport,
    bottom_bottom: rect.bottom - viewport,
    top_center: rect.top - viewport / 2,
    center_center: rect.top + rect.height / 2 - viewport / 2,
    bottom_center: rect.bottom - viewport / 2,
  };
  const from = poses[start];
  const to = poses[end];
  const length = Math.abs(from - to) || 1;
  return Math.min(Math.max(0, 1 - (from + length) / length), 1);
}
