/**
 * GenesisLight — radial-gradient expanding glow effect for creation passages.
 * "Let there be light" — Gen 1:3
 */

import { useEffect, useRef } from 'react';
import { animate } from 'motion';

interface Props {
  onComplete?: () => void;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function GenesisLight({ onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) {
      onComplete?.();
      return;
    }

    animate(
      el,
      {
        opacity: [0, 1, 0.8, 0],
        scale: [0.5, 1.2, 1.5, 2],
      },
      {
        duration: 2.5,
        easing: 'ease-out',
        onComplete,
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (reducedMotion) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9000,
        opacity: 0,
        background:
          'radial-gradient(ellipse at center, rgba(255,240,180,0.85) 0%, rgba(255,200,80,0.5) 35%, transparent 70%)',
        mixBlendMode: 'screen',
      }}
    />
  );
}
