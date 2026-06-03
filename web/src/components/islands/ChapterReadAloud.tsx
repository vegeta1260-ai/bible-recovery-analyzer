import { useState, useEffect, useCallback } from 'react';

interface Props {
  /** 逐章 slot 的 id 前綴（同 ChapterRecovery），如 "rec-John-3-"。用來收集各節中文經文。 */
  slotPrefix: string;
}

/**
 * 朗讀本章中文恢復本經文（瀏覽器 Web Speech API）。
 * 經文由 ChapterRecovery runtime 填入 slot，故朗讀時即時讀取 DOM 內 .rec-zh 文字。
 * 不支援 speechSynthesis 的瀏覽器則不顯示按鈕（漸進增強）。
 */
export default function ChapterReadAloud({ slotPrefix }: Props) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSupported(ok);
    return () => { if (ok) window.speechSynthesis.cancel(); };
  }, []);

  const collect = useCallback((): string[] => {
    const slots = Array.from(document.querySelectorAll(`[id^="${slotPrefix}"]`));
    const out: string[] = [];
    for (const s of slots) {
      const zh = s.querySelector('.rec-zh')?.textContent?.trim();
      if (zh) out.push(zh);
    }
    return out;
  }, [slotPrefix]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const start = useCallback(() => {
    const parts = collect();
    if (parts.length === 0) return; // 經文尚未載入則不動作
    window.speechSynthesis.cancel();
    parts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-TW';
      u.rate = 0.95;
      if (i === parts.length - 1) u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    });
    setSpeaking(true);
  }, [collect]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className="read-aloud-btn"
      onClick={speaking ? stop : start}
      aria-pressed={speaking}
    >
      {speaking ? '⏹ 停止朗讀' : '🔊 朗讀本章（中文）'}
    </button>
  );
}
