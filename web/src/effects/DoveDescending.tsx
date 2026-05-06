/**
 * DoveDescending — SVG dove path descending from top with CSS animation.
 * Matt 3:16, John 1:32 — the Spirit descending as a dove.
 */

import { useEffect } from 'react';

interface Props {
  onComplete?: () => void;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function DoveDescending({ onComplete }: Props) {
  useEffect(() => {
    if (reducedMotion) { onComplete?.(); return; }
    const timer = setTimeout(() => onComplete?.(), 2800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (reducedMotion) return null;

  // Stylised dove SVG path (body + wings)
  return (
    <>
      <style>{`
        @keyframes dove-descend {
          0%   { transform: translate(-50%, -120px) rotate(-10deg); opacity: 0; }
          20%  { opacity: 1; }
          60%  { transform: translate(-50%, 35vh) rotate(5deg); }
          80%  { transform: translate(-50%, 45vh) rotate(-3deg); opacity: 1; }
          100% { transform: translate(-50%, 55vh) rotate(0deg); opacity: 0; }
        }
        @keyframes dove-wings {
          0%,100% { d: path("M -20 0 Q -5 -18 0 -8 Q 5 -18 20 0"); }
          50%     { d: path("M -20 0 Q -5 5  0  2  Q 5  5  20 0"); }
        }
        .dove-container {
          position: fixed;
          left: 50%;
          top: 0;
          pointer-events: none;
          z-index: 9000;
          animation: dove-descend 2.8s ease-in-out forwards;
        }
      `}</style>
      <div className="dove-container" aria-hidden="true">
        <svg width="80" height="60" viewBox="-40 -30 80 60">
          {/* Body */}
          <ellipse cx="0" cy="8" rx="12" ry="7" fill="white" opacity="0.9" />
          {/* Head */}
          <circle cx="14" cy="2" r="5" fill="white" opacity="0.9" />
          {/* Beak */}
          <path d="M 19 2 L 23 1 L 19 3 Z" fill="#f0c060" />
          {/* Tail */}
          <path d="M -12 10 L -22 16 L -10 12 Z" fill="white" opacity="0.85" />
          {/* Wings (animating via CSS d property — not supported in all browsers, using static) */}
          <path
            d="M -18 2 Q -5 -16 0 -6 Q 5 -16 18 2"
            fill="white"
            stroke="#e8e8e8"
            strokeWidth="0.5"
            opacity="0.95"
            style={{
              animation: 'dove-wings 0.5s ease-in-out infinite',
            }}
          />
        </svg>
      </div>
    </>
  );
}
