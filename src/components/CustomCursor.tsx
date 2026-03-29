import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    document.body.classList.add('custom-cursor');

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!visible) setVisible(true);
      gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' });
      gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.25, ease: 'power2.out' });
    };

    const onMouseEnterInteractive = () => {
      gsap.to(ring, { scale: 1.8, opacity: 0.4, duration: 0.3 });
      gsap.to(dot, { scale: 0.5, duration: 0.3 });
    };

    const onMouseLeaveInteractive = () => {
      gsap.to(ring, { scale: 1, opacity: 1, duration: 0.3 });
      gsap.to(dot, { scale: 1, duration: 0.3 });
    };

    const onMouseLeaveWindow = () => {
      setVisible(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeaveWindow);

    const interactiveSelector = 'a, button, [data-cursor="pointer"], input, textarea, select';

    const observer = new MutationObserver(() => {
      document.querySelectorAll(interactiveSelector).forEach((el) => {
        if (el.getAttribute('data-cursor-bound')) return;
        el.setAttribute('data-cursor-bound', 'true');
        el.addEventListener('mouseenter', onMouseEnterInteractive);
        el.addEventListener('mouseleave', onMouseLeaveInteractive);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll(interactiveSelector).forEach((el) => {
      el.setAttribute('data-cursor-bound', 'true');
      el.addEventListener('mouseenter', onMouseEnterInteractive);
      el.addEventListener('mouseleave', onMouseLeaveInteractive);
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeaveWindow);
      document.body.classList.remove('custom-cursor');
      observer.disconnect();
    };
  }, [visible]);

  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 bg-foreground rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 border border-foreground/50 rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: visible ? 1 : 0 }}
      />
    </>
  );
};

export default CustomCursor;
