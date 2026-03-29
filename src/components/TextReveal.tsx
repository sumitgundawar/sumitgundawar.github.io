import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface TextRevealProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  mode?: 'words' | 'chars';
  delay?: number;
  stagger?: number;
  duration?: number;
  scrub?: boolean;
}

const TextReveal = ({
  text,
  className,
  as: Tag = 'h1',
  mode = 'words',
  delay = 0,
  stagger = 0.04,
  duration = 0.6,
  scrub = false,
}: TextRevealProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll('.reveal-unit');

    gsap.set(elements, { y: '100%', opacity: 0 });

    if (scrub) {
      gsap.to(elements, {
        y: '0%',
        opacity: 1,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          end: 'top 40%',
          scrub: 1,
        },
      });
    } else {
      ScrollTrigger.create({
        trigger: container,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(elements, {
            y: '0%',
            opacity: 1,
            duration,
            stagger,
            delay,
            ease: 'power3.out',
          });
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(t => {
        if (t.trigger === container) t.kill();
      });
    };
  }, [text, mode, delay, stagger, duration, scrub]);

  const units = mode === 'words' ? text.split(' ') : text.split('');

  return (
    <Tag ref={containerRef as React.RefObject<HTMLElement>} className={cn('overflow-hidden', className)}>
      {units.map((unit, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <span className="reveal-unit inline-block">
            {unit}
          </span>
          {mode === 'words' && i < units.length - 1 ? <span>&nbsp;</span> : null}
          {mode === 'chars' && unit === ' ' ? <span>&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
};

export default TextReveal;
