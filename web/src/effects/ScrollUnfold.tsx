/**
 * ScrollUnfold — ancient scroll reveal animation.
 * CSS clip-path expanding from center + Motion opacity fade.
 * Respects prefers-reduced-motion by rendering children immediately.
 */

import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';

interface Props {
  children: React.ReactNode;
  /** Delay before animation starts, ms */
  delay?: number;
  className?: string;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function ScrollUnfold({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const timer = setTimeout(() => {
      setVisible(true);
      // Motion: fade in + scale
      animate(
        el,
        { opacity: [0, 1], scale: [0.96, 1] },
        { duration: 0.7, easing: [0.22, 1, 0.36, 1] }
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`scroll-unfold${visible ? ' scroll-unfold--visible' : ''} ${className}`}
      style={reducedMotion ? undefined : { opacity: 0 }}
    >
      {children}
      <style>{`
        .scroll-unfold {
          clip-path: inset(40% 0 40% 0 round 4px);
          transition: clip-path 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .scroll-unfold--visible {
          clip-path: inset(0% 0 0% 0 round 0px);
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-unfold {
            clip-path: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
