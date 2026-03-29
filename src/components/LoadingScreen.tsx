import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';

interface LoadingScreenProps {
  children: React.ReactNode;
}

const LoadingScreen = ({ children }: LoadingScreenProps) => {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const text = textRef.current;
    const line = lineRef.current;
    if (!overlay || !text || !line) return;

    const tl = gsap.timeline({
      onComplete: () => setDone(true),
    });

    tl.set(text, { y: 20, opacity: 0 })
      .set(line, { scaleX: 0 })
      .to(text, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.2)
      .to(line, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.4)
      .to(text, { y: -20, opacity: 0, duration: 0.4, ease: 'power3.in' }, 1.2)
      .to(line, { scaleX: 0, duration: 0.3, ease: 'power2.in' }, 1.2)
      .to(overlay, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, 1.5);
  }, []);

  return (
    <>
      {!done && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center"
        >
          <div ref={textRef} className="font-space-grotesk text-4xl md:text-6xl font-bold text-foreground tracking-tight">
            SG
          </div>
          <div
            ref={lineRef}
            className="mt-4 h-[2px] w-16 bg-primary origin-center"
          />
        </div>
      )}
      <div style={{ opacity: done ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        {children}
      </div>
    </>
  );
};

export default LoadingScreen;
