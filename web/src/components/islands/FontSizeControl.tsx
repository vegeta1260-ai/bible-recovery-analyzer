import { useState, useEffect } from 'react';

const SCALES = ['1', '1.3', '1.6'] as const;
const LABELS = ['A', 'A+', 'A++'] as const;

export default function FontSizeControl() {
  const [scaleIndex, setScaleIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('fontScale');
    if (saved) {
      const idx = SCALES.indexOf(saved as typeof SCALES[number]);
      if (idx !== -1) { setScaleIndex(idx); document.documentElement.setAttribute('data-font-scale', saved); }
    }
  }, []);

  const cycle = () => {
    const next = (scaleIndex + 1) % SCALES.length;
    setScaleIndex(next);
    const scale = SCALES[next];
    document.documentElement.setAttribute('data-font-scale', scale);
    localStorage.setItem('fontScale', scale);
  };

  return (
    <button onClick={cycle} aria-label={`字體大小：${LABELS[scaleIndex]}，點擊切換`}
      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--color-text)', fontSize: 'var(--font-sm)', fontWeight: 500 }}>
      {LABELS[scaleIndex]}
    </button>
  );
}
