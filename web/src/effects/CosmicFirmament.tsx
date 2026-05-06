/**
 * CosmicFirmament — Canvas starfield with randomly twinkling stars.
 * Gen 1:14, Ps 8:3 — the firmament and stars.
 */

import { useEffect, useRef } from 'react';

interface Props {
  starCount?: number;
  duration?: number;
  onComplete?: () => void;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  brightness: number;
}

export default function CosmicFirmament({ starCount = 180, duration = 4000, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) { onComplete?.(); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Seed deterministic stars
    const stars: Star[] = Array.from({ length: starCount }, (_, i) => ({
      x: ((i * 7919) % W),
      y: ((i * 6271) % H),
      r: 0.5 + (i % 5) * 0.35,
      phase: (i * 0.3) % (Math.PI * 2),
      speed: 0.4 + (i % 7) * 0.15,
      brightness: 0.4 + (i % 3) * 0.2,
    }));

    let startTime: number | null = null;
    let rafId: number;

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, W, H);
      // Dark sky background fading in then out
      const bgAlpha = progress < 0.5
        ? progress * 2 * 0.85
        : (1 - progress) * 2 * 0.85;
      ctx.fillStyle = `rgba(5, 5, 25, ${bgAlpha})`;
      ctx.fillRect(0, 0, W, H);

      stars.forEach(star => {
        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 0.001 * star.speed + star.phase);
        const alpha = star.brightness * twinkle * bgAlpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 220, 255, ${alpha})`;
        ctx.fill();
      });

      if (progress < 1) {
        rafId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
        onComplete?.();
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9000,
      }}
    />
  );
}
