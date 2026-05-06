/**
 * PentecostFlames — CSS animated flame shapes.
 * Acts 2:3 — tongues of fire resting on each person.
 */

interface Props {
  flameCount?: number;
  onComplete?: () => void;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function PentecostFlames({ flameCount = 7, onComplete }: Props) {
  if (reducedMotion) { onComplete?.(); return null; }

  const flames = Array.from({ length: flameCount }, (_, i) => ({
    id: i,
    left: `${8 + (i / (flameCount - 1)) * 84}%`,
    delay: `${(i * 0.18).toFixed(2)}s`,
    height: 60 + Math.floor(Math.sin(i * 1.3) * 20),
    hue: 20 + i * 6,
  }));

  return (
    <>
      <style>{`
        @keyframes flame-flicker {
          0%,100% { transform: scaleX(1)   scaleY(1)   rotate(-2deg); opacity: 0.9; }
          25%      { transform: scaleX(0.9) scaleY(1.1) rotate(2deg);  opacity: 1;   }
          50%      { transform: scaleX(1.1) scaleY(0.95) rotate(-1deg);opacity: 0.8; }
          75%      { transform: scaleX(0.95) scaleY(1.05) rotate(3deg);opacity: 1;   }
        }
        @keyframes flame-rise {
          0%   { opacity: 0; bottom: -20px; }
          15%  { opacity: 1; }
          80%  { opacity: 0.8; }
          100% { opacity: 0; bottom: 60%; }
        }
        .pf-wrap {
          position: fixed; inset: 0; pointer-events: none; z-index: 9000; overflow: hidden;
        }
        .pf-flame {
          position: absolute;
          bottom: 0;
          width: 28px;
          border-radius: 50% 50% 20% 20%;
          transform-origin: bottom center;
          animation:
            flame-rise 2.4s ease-out forwards,
            flame-flicker 0.3s ease-in-out infinite;
          filter: blur(1px);
        }
      `}</style>
      <div className="pf-wrap" aria-hidden="true">
        {flames.map(f => (
          <div
            key={f.id}
            className="pf-flame"
            style={{
              left: f.left,
              height: f.height,
              background: `linear-gradient(to top, hsl(${f.hue},100%,50%) 0%, hsl(${f.hue + 30},100%,70%) 60%, rgba(255,255,200,0.8) 100%)`,
              animationDelay: f.delay,
              animationDuration: `2.4s, 0.${2 + (f.id % 4)}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
