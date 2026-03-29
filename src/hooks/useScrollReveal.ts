import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';

interface ScrollRevealOptions {
  y?: number;
  x?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  once?: boolean;
}

export function useScrollReveal<T extends HTMLElement>(options: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  const {
    y = 40,
    x = 0,
    opacity = 0,
    duration = 0.8,
    delay = 0,
    ease = 'power3.out',
    once = true,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { y, x, autoAlpha: opacity });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once,
      onEnter: () => {
        gsap.to(el, { y: 0, x: 0, autoAlpha: 1, duration, delay, ease });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [y, x, opacity, duration, delay, ease, once]);

  return ref;
}
