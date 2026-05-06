/**
 * Audio state management — enabled/disabled with localStorage persistence.
 * Works in SSR (no window) by defaulting to true.
 */

const STORAGE_KEY = 'bra_audio_enabled';

export type AudioStoreListener = (enabled: boolean) => void;

let _enabled = true;
const _listeners: Set<AudioStoreListener> = new Set();

/** Initialise from localStorage. Call once on client mount. */
export function initAudioStore(): void {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    _enabled = stored !== 'false';
  }
}

export function isAudioEnabled(): boolean {
  return _enabled;
}

export function setAudioEnabled(value: boolean): void {
  _enabled = value;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }
  _listeners.forEach(fn => fn(value));
}

export function toggleAudio(): boolean {
  setAudioEnabled(!_enabled);
  return _enabled;
}

export function subscribeAudio(listener: AudioStoreListener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
