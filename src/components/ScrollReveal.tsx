import { ReactNode } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  as?: keyof JSX.IntrinsicElements;
}

const ScrollReveal = ({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 0.8,
  as: Tag = 'div',
}: ScrollRevealProps) => {
  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  const { y, x } = directionMap[direction];
  const ref = useScrollReveal<HTMLDivElement>({ y, x, delay, duration });

  return (
    // @ts-expect-error dynamic tag with ref
    <Tag ref={ref} className={cn('h-full', className)}>
      {children}
    </Tag>
  );
};

export default ScrollReveal;
