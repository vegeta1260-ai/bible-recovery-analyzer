/**
 * Audio state management — enabled/disabled。
 * 預設「關閉」，且「不跨頁記憶」：瀏覽器自動播放政策需使用者手勢才能出聲，
 * 若記住「開啟」，新頁面載入時喇叭會顯示開啟卻無聲（誤導）。故每次頁面載入一律關閉，
 * 使用者主動按 M 或音效鈕才開啟並播放（此點擊即提供手勢、解除自動播放限制）。
 *
 * 同一頁內跨 Astro island 同步：AudioController（Header 島）與 ChapterMusic（逐章頁島）等
 * 各自獨立水合、各自打包此模組、記憶體單例不共享。故狀態改變時用 window 事件廣播，
 * 各島於 initAudioStore() 監聽，收到後更新自身狀態並通知自身 listeners。
 * dispatchEvent 為「同步」呼叫，能保住使用者點擊的手勢鏈（讓播放不被自動播放政策擋）。
 */

const EVENT_KEY = 'bra-audio-changed';

export type AudioStoreListener = (enabled: boolean) => void;

let _enabled = false;
const _listeners: Set<AudioStoreListener> = new Set();
let _wired = false;

function notify(value: boolean): void {
  _listeners.forEach(fn => fn(value));
}

/** 接上同頁跨島同步。Call once on client mount（每個島都要呼叫）。不從儲存恢復狀態（一律關閉起始）。 */
export function initAudioStore(): void {
  if (typeof window === 'undefined' || _wired) return;
  _wired = true;
  window.addEventListener(EVENT_KEY, (e) => {
    const value = (e as CustomEvent<boolean>).detail;
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
    // 廣播給同頁其他島（本島的 window listener 因 value === _enabled 會略過，不重複 notify）
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
