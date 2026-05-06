/**
 * TreeOfLife — SVG tree growing with stroke-dasharray animation.
 * Rev 22:2, Gen 2:9 — the tree of life.
 */

import { useEffect, useRef } from 'react';

interface Props {
  size?: number;
  color?: string;
  onComplete?: () => void;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function TreeOfLife({ size = 200, color = '#2d6a2d', onComplete }: Props) {
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reducedMotion) { onComplete?.(); return; }
    const g = groupRef.current;
    if (!g) return;

    const paths = g.querySelectorAll<SVGPathElement>('path');
    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.animation = `tree-grow 0.8s ${(i * 0.15).toFixed(2)}s ease-out forwards`;
    });

    const lastPath = paths[paths.length - 1];
    if (lastPath) {
      const delay = (paths.length - 1) * 0.15 * 1000 + 800;
      setTimeout(() => onComplete?.(), delay);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cx = size / 2;
  const cy = size * 0.9;

  // Trunk + branches paths
  const trunk = `M ${cx} ${cy} L ${cx} ${cy - size * 0.35}`;
  const branch1L = `M ${cx} ${cy - size * 0.25} Q ${cx - size * 0.28} ${cy - size * 0.38} ${cx - size * 0.35} ${cy - size * 0.45}`;
  const branch1R = `M ${cx} ${cy - size * 0.25} Q ${cx + size * 0.28} ${cy - size * 0.38} ${cx + size * 0.35} ${cy - size * 0.45}`;
  const branch2L = `M ${cx} ${cy - size * 0.35} Q ${cx - size * 0.22} ${cy - size * 0.52} ${cx - size * 0.28} ${cy - size * 0.62}`;
  const branch2R = `M ${cx} ${cy - size * 0.35} Q ${cx + size * 0.22} ${cy - size * 0.52} ${cx + size * 0.28} ${cy - size * 0.62}`;
  const top = `M ${cx} ${cy - size * 0.35} Q ${cx} ${cy - size * 0.7} ${cx} ${cy - size * 0.75}`;

  const paths = [trunk, branch1L, branch1R, branch2L, branch2R, top];

  return (
    <>
      <style>{`
        @keyframes tree-grow {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9000,
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g ref={groupRef}>
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={i === 0 ? 5 : 3}
                strokeLinecap="round"
              />
            ))}
          </g>
          {/* Foliage circles */}
          {!reducedMotion && [
            { cx: cx, cy: cy - size * 0.78, r: size * 0.12 },
            { cx: cx - size * 0.35, cy: cy - size * 0.48, r: size * 0.1 },
            { cx: cx + size * 0.35, cy: cy - size * 0.48, r: size * 0.1 },
            { cx: cx - size * 0.28, cy: cy - size * 0.65, r: size * 0.09 },
            { cx: cx + size * 0.28, cy: cy - size * 0.65, r: size * 0.09 },
          ].map((c, i) => (
            <circle
              key={i}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={color}
              opacity={0.55}
              style={{ animation: `tree-grow 0.6s ${(paths.length * 0.15 + i * 0.1).toFixed(2)}s ease-out both` }}
            />
          ))}
        </svg>
      </div>
    </>
  );
}
