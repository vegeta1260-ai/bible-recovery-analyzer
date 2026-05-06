/**
 * ResurrectionQuake — CSS transform shake + Motion intensity fade.
 * Matt 28:2 — there was a great earthquake.
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

export default function ResurrectionQuake({ onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) { onComplete?.(); return; }
    const el = ref.current;
    if (!el) return;

    // Shake sequence via rapid x/y translate
    const shakeFrames = [0, -6, 5, -4, 8, -5, 3, -2, 1, 0];
    animate(
      el,
      { x: shakeFrames, y: shakeFrames.map(v => v * 0.5) },
      { duration: 1.0, easing: 'linear', onComplete }
    );

    // Flash overlay
    animate(el, { opacity: [0, 0.4, 0] }, { duration: 1.0, easing: 'ease-out' });
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
        background: 'rgba(200, 180, 120, 0.3)',
      }}
    />
  );
}
