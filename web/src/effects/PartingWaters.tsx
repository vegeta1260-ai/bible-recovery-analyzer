/**
 * PartingWaters — two panels sliding apart with a wave SVG at the split.
 * Red Sea parting — Exod 14
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

export default function PartingWaters({ onComplete }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) { onComplete?.(); return; }
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    // Slide panels apart
    animate(left, { x: [0, '-48%'], opacity: [0.9, 0.6, 0] }, {
      duration: 1.8, easing: 'ease-in-out', onComplete,
    });
    animate(right, { x: [0, '48%'], opacity: [0.9, 0.6, 0] }, {
      duration: 1.8, easing: 'ease-in-out',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (reducedMotion) return null;

  const waveD =
    'M0 30 C20 10, 40 50, 60 30 C80 10, 100 50, 120 30 C140 10, 160 50, 180 30 C200 10, 220 50, 240 30 L240 60 L0 60 Z';

  const panelBase: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    width: '50%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 9000,
    overflow: 'hidden',
  };

  return (
    <div aria-hidden="true">
      {/* Left water panel */}
      <div
        ref={leftRef}
        style={{
          ...panelBase,
          left: 0,
          background: 'linear-gradient(180deg, #1a6fa0 0%, #0d4d78 60%, #083654 100%)',
        }}
      >
        <svg
          width="100%"
          height="60"
          viewBox="0 0 240 60"
          style={{ position: 'absolute', bottom: 0, right: -1 }}
          preserveAspectRatio="none"
        >
          <path d={waveD} fill="#1a6fa0" />
        </svg>
      </div>

      {/* Right water panel */}
      <div
        ref={rightRef}
        style={{
          ...panelBase,
          right: 0,
          background: 'linear-gradient(180deg, #1a6fa0 0%, #0d4d78 60%, #083654 100%)',
        }}
      >
        <svg
          width="100%"
          height="60"
          viewBox="0 0 240 60"
          style={{ position: 'absolute', bottom: 0, left: -1, transform: 'scaleX(-1)' }}
          preserveAspectRatio="none"
        >
          <path d={waveD} fill="#1a6fa0" />
        </svg>
      </div>
    </div>
  );
}
