import { useEffect, useRef } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { trackScrollDepth, trackSectionView, trackTimeOnPage } from '@/lib/analytics';

const ScrollAnalytics = () => {
  const firedDepths = useRef(new Set<number>());
  const firedSections = useRef(new Set<string>());

  useEffect(() => {
    // Scroll depth tracking at 25, 50, 75, 100%
    [25, 50, 75, 100].forEach((depth) => {
      ScrollTrigger.create({
        trigger: document.body,
        start: `${depth}% bottom`,
        once: true,
        onEnter: () => {
          if (!firedDepths.current.has(depth)) {
            firedDepths.current.add(depth);
            trackScrollDepth(depth);
          }
        },
      });
    });

    // Section view tracking
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      const id = section.id;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          if (!firedSections.current.has(id)) {
            firedSections.current.add(id);
            trackSectionView(id);
          }
        },
      });
    });

    // Time on page tracking
    const startTime = Date.now();
    const intervals = [30, 60, 120, 300];
    const timers = intervals.map((seconds) =>
      setTimeout(() => trackTimeOnPage(seconds), seconds * 1000)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
};

export default ScrollAnalytics;
