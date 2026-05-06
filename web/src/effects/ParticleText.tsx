/**
 * ParticleText — tsparticles particle convergence effect.
 * Particles start scattered and converge toward a text mask.
 * Respects prefers-reduced-motion by rendering plain text instead.
 */

import { useEffect, useRef, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from 'tsparticles-engine';

interface Props {
  text: string;
  fontSize?: number;
  color?: string;
  particleCount?: number;
}

const reducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function ParticleText({
  text,
  fontSize = 48,
  color = '#4f7cac',
  particleCount = 120,
}: Props) {
  const [engineReady, setEngineReady] = useState(false);
  const idRef = useRef(`pt-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (reducedMotion) return;
    initParticlesEngine(async engine => {
      await loadSlim(engine);
    }).then(() => setEngineReady(true));
  }, []);

  if (reducedMotion) {
    return (
      <span style={{ fontSize, color, fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
        {text}
      </span>
    );
  }

  const options: ISourceOptions = {
    fullScreen: { enable: false },
    background: { color: { value: 'transparent' } },
    particles: {
      number: { value: particleCount },
      color: { value: color },
      shape: { type: 'circle' },
      opacity: { value: { min: 0.3, max: 0.9 } },
      size: { value: { min: 1, max: 3 } },
      move: {
        enable: true,
        speed: 2,
        direction: 'none',
        random: false,
        straight: false,
        outModes: { default: 'out' },
        attract: { enable: true, rotate: { x: 600, y: 1200 } },
      },
      links: {
        enable: true,
        distance: 60,
        color,
        opacity: 0.3,
        width: 1,
      },
    },
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'repulse' },
      },
      modes: {
        repulse: { distance: 80, duration: 0.4 },
      },
    },
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: fontSize * text.length * 0.6,
        minHeight: fontSize * 1.4,
      }}
    >
      {/* Text layer underneath particles */}
      <span
        aria-label={text}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-sans)',
          opacity: 0.15,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {text}
      </span>
      {engineReady && (
        <Particles
          id={idRef.current}
          options={options}
          style={{ position: 'absolute', inset: 0 }}
        />
      )}
    </div>
  );
}
