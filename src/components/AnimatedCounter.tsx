import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  label: string;
  sublabel?: string;
  className?: string;
}

const AnimatedCounter = ({
  target,
  prefix = '',
  suffix = '',
  duration = 2,
  decimals = 0,
  label,
  sublabel,
  className,
}: AnimatedCounterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const counter = { value: 0 };

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;

        gsap.to(counter, {
          value: target,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            const formatted = decimals > 0
              ? counter.value.toFixed(decimals)
              : Math.round(counter.value).toLocaleString();
            setDisplay(`${prefix}${formatted}${suffix}`);
          },
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [target, prefix, suffix, duration, decimals]);

  return (
    <div ref={containerRef} className={cn('text-center', className)}>
      <div className="text-4xl md:text-5xl lg:text-6xl font-bold font-space-grotesk text-foreground tracking-tight">
        {display}
      </div>
      <div className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">{label}</div>
      {sublabel && (
        <div className="mt-1 text-xs text-muted-foreground/60">{sublabel}</div>
      )}
    </div>
  );
};

export default AnimatedCounter;
