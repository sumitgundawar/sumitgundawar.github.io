import { useRef, useCallback, ReactNode } from 'react';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

const TiltCard = ({ children, className, intensity = 8 }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(el, {
      rotateY: x * intensity,
      rotateX: -y * intensity,
      transformPerspective: 800,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    gsap.to(el, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  }, []);

  return (
    <div
      ref={ref}
      className={cn('will-change-transform', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
};

export default TiltCard;
