/**
 * Web Audio API procedural sound effects.
 * Three generators: paper turn (noise+bandpass), bell (sine decay), ambient pad (lfo fade).
 * All effects are no-ops when AudioContext is unavailable (SSR/test environments).
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume suspended context (browsers suspend until user gesture)
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/** White noise burst through bandpass filter — paper/page-turn sound. */
export function playPageTurn(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.12; // 120 ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3500;
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + 0.13);
}

/** Sine wave oscillator with exponential decay — bell/chime sound. */
export function playBell(frequency = 528): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequency;

  // Slight harmonic overtone
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 2.76;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.06, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(ctx.destination);
  gain2.connect(ctx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + 2.6);
  osc2.stop(now + 1.3);
}

let _padGain: GainNode | null = null;
let _padOsc: OscillatorNode | null = null;

/** Low frequency oscillator with slow gain fade — ambient drone/pad. */
export function playAmbientPad(on: boolean): void {
  const ctx = getCtx();
  if (!ctx) return;

  if (on) {
    if (_padOsc) return; // already running
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 3);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);

    _padOsc = osc;
    _padGain = gain;
  } else {
    if (!_padOsc || !_padGain) return;
    const ctx2 = getCtx();
    if (!ctx2) return;
    const now = ctx2.currentTime;
    _padGain.gain.linearRampToValueAtTime(0, now + 2);
    _padOsc.stop(now + 2.1);
    _padOsc = null;
    _padGain = null;
  }
}
