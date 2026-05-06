/**
 * LivingWaterLoader — SVG wave path animated with stroke-dashoffset.
 * Used as a loading/progress indicator. Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react';

interface Props {
  /** 0–1 progress value. Omit for indeterminate/looping mode. */
  progress?: number;
  width?: number;
  height?: number;
  color?: string;
}

export default function LivingWaterLoader({
  progress,
  width = 200,
  height = 40,
  color = 'var(--color-primary)',
}: Props) {
  const pathRef = useRef<SVGPathElement>(null);

  // Check prefers-reduced-motion
  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);

    if (progress !== undefined) {
      // Determinate: fill from left
      el.style.strokeDashoffset = String(len * (1 - progress));
      el.style.animation = 'none';
    } else if (!reducedMotion) {
      // Indeterminate: animate dashoffset
      el.style.strokeDashoffset = String(len);
      el.style.animation = 'living-water-flow 2s linear infinite';
    } else {
      // Reduced motion: static full line
      el.style.strokeDashoffset = '0';
      el.style.animation = 'none';
    }
  }, [progress, reducedMotion]);

  // Wave path: a sinusoidal SVG path across the width
  const amplitude = height * 0.35;
  const cy = height / 2;
  const segments = 4;
  const segW = width / segments;

  let d = `M 0 ${cy}`;
  for (let i = 0; i < segments; i++) {
    const x1 = i * segW + segW / 4;
    const x2 = i * segW + segW * 3 / 4;
    const x3 = (i + 1) * segW;
    const y1 = cy - amplitude;
    const y2 = cy + amplitude;
    d += ` C ${x1} ${y1}, ${x2} ${y1}, ${x3 - segW / 2} ${cy}`;
    d += ` C ${x3 - segW / 4} ${y2}, ${x3} ${y2}, ${x3} ${cy}`;
  }

  return (
    <>
      <style>{`
        @keyframes living-water-flow {
          0%   { stroke-dashoffset: var(--lw-len, 1000); }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label="載入中"
        role="img"
        style={{ display: 'block' }}
      >
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transition: progress !== undefined ? 'stroke-dashoffset 0.4s ease' : undefined,
          }}
        />
      </svg>
    </>
  );
}
