/**
 * Audio state management — enabled/disabled with localStorage persistence.
 * 預設「關閉」：背景音樂不自動播放（安靜讀經/聚會場合較合宜，且瀏覽器多半擋自動播放）。
 * 使用者按 M 或音效鈕主動開啟，選擇會存進 localStorage。
 *
 * 跨 Astro island 同步：AudioController（Header 島）與 ChapterMusic（逐章頁島）等是各自
 * 獨立水合、各自打包此模組的島，記憶體單例「不共享」。故狀態改變時額外用 window 事件廣播，
 * 各島於 initAudioStore() 時監聽，收到後更新自身狀態並通知自身 listeners。
 * dispatchEvent 為「同步」呼叫，能保住使用者點擊的手勢鏈（讓 switchMusic 的播放不被自動播放政策擋）。
 */

const STORAGE_KEY = 'bra_audio_enabled';
const EVENT_KEY = 'bra-audio-changed';

export type AudioStoreListener = (enabled: boolean) => void;

let _enabled = false;
const _listeners: Set<AudioStoreListener> = new Set();
let _wired = false;

function notify(value: boolean): void {
  _listeners.forEach(fn => fn(value));
}

/** Initialise from localStorage + 接上跨島同步。Call once on client mount（每個島都要呼叫）。 */
export function initAudioStore(): void {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    _enabled = stored !== 'false';
  }
  if (_wired) return;
  _wired = true;
  // 同分頁、跨島：收到其他島的廣播 → 更新本島狀態並通知本島 listeners（不再廣播，避免迴圈）
  window.addEventListener(EVENT_KEY, (e) => {
    const value = (e as CustomEvent<boolean>).detail;
    if (value === _enabled) return;
    _enabled = value;
    notify(value);
  });
  // 跨分頁：localStorage 變更
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const value = e.newValue !== 'false';
    if (value === _enabled) return;
    _enabled = value;
    notify(value);
  });
}

export function isAudioEnabled(): boolean {
  return _enabled;
}

export function setAudioEnabled(value: boolean): void {
  _enabled = value;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(value));
    // 廣播給其他島（本島的 window listener 因 value === _enabled 會略過，不重複 notify）
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: value }));
  }
  notify(value);
}

export function toggleAudio(): boolean {
  setAudioEnabled(!_enabled);
  return _enabled;
}

export function subscribeAudio(listener: AudioStoreListener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
