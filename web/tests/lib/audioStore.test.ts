import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initAudioStore,
  isAudioEnabled,
  setAudioEnabled,
  toggleAudio,
  subscribeAudio,
} from '@/audio/audioStore';

beforeEach(() => {
  // 重置為預設（關閉）狀態
  setAudioEnabled(false);
});

describe('audioStore', () => {
  it('預設關閉（不自動播放）', () => {
    expect(isAudioEnabled()).toBe(false);
  });

  it('setAudioEnabled 改變狀態', () => {
    setAudioEnabled(true);
    expect(isAudioEnabled()).toBe(true);
    setAudioEnabled(false);
    expect(isAudioEnabled()).toBe(false);
  });

  it('toggleAudio 翻轉狀態', () => {
    setAudioEnabled(true);
    const result = toggleAudio();
    expect(result).toBe(false);
    expect(isAudioEnabled()).toBe(false);
  });

  it('不跨頁記憶：不寫入 localStorage（避免新頁面顯示開啟卻無聲）', () => {
    const setItem = vi.fn();
    Object.defineProperty(globalThis, 'localStorage', {
      value: { setItem, getItem: () => null, removeItem: () => {}, clear: () => {} },
      writable: true,
      configurable: true,
    });
    setAudioEnabled(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('initAudioStore 不從儲存恢復狀態（一律維持關閉起始）', () => {
    setAudioEnabled(false);
    initAudioStore();
    expect(isAudioEnabled()).toBe(false);
  });

  it('subscribeAudio fires listener on change', () => {
    const spy = vi.fn();
    const unsub = subscribeAudio(spy);
    setAudioEnabled(true);
    expect(spy).toHaveBeenCalledWith(true);
    unsub();
    setAudioEnabled(false);
    expect(spy).toHaveBeenCalledTimes(1); // 退訂後不再呼叫
  });

  it('window 事件跨島同步：收到廣播時更新狀態並通知 listeners', () => {
    const spy = vi.fn();
    subscribeAudio(spy);
    // 模擬「另一個島」的 setAudioEnabled 廣播
    window.dispatchEvent(new CustomEvent('bra-audio-changed', { detail: true }));
    expect(isAudioEnabled()).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);
  });
});
