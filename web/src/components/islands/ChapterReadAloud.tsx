import { useState, useEffect, useCallback } from 'react';

interface Props {
  /** 逐章 slot 的 id 前綴（同 ChapterRecovery），如 "rec-John-3-"。 */
  slotPrefix: string;
}

type LangKey = 'zh' | 'en' | 'yue';

interface LangDef {
  key: LangKey;
  label: string;
  /** 取哪一語言的經文：中文/粵語讀 .rec-zh，英文讀 .rec-en */
  source: 'zh' | 'en';
  /** utterance.lang */
  bcp47: string;
  /** 挑選語音時優先比對的 lang 前綴（小寫） */
  voicePrefixes: string[];
}

const LANGS: LangDef[] = [
  { key: 'zh',  label: '中文', source: 'zh', bcp47: 'zh-TW', voicePrefixes: ['zh-tw', 'zh-hant', 'cmn', 'zh'] },
  { key: 'en',  label: '英文', source: 'en', bcp47: 'en-US', voicePrefixes: ['en'] },
  { key: 'yue', label: '粵語', source: 'zh', bcp47: 'zh-HK', voicePrefixes: ['zh-hk', 'yue', 'zh-hant-hk'] },
];

/**
 * 朗讀本章恢復本經文（瀏覽器 Web Speech API），分中文／英文／粵語。
 * 經文由 ChapterRecovery runtime 填入 slot，朗讀時即時讀 DOM 內 .rec-zh / .rec-en。
 * 不支援 speechSynthesis 的瀏覽器則不顯示（漸進增強）。粵語需裝置有廣東話語音才道地。
 */
export default function ChapterReadAloud({ slotPrefix }: Props) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState<LangKey | null>(null);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSupported(ok);
    if (ok) {
      // 預載語音清單（部分瀏覽器首次 getVoices 為空，需等 voiceschanged）
      window.speechSynthesis.getVoices();
    }
    return () => { if (ok) window.speechSynthesis.cancel(); };
  }, []);

  const collect = useCallback((source: 'zh' | 'en'): string[] => {
    const sel = source === 'en' ? '.rec-en' : '.rec-zh';
    const slots = Array.from(document.querySelectorAll(`[id^="${slotPrefix}"]`));
    const out: string[] = [];
    for (const s of slots) {
      const t = s.querySelector(sel)?.textContent?.trim();
      if (t) out.push(t);
    }
    return out;
  }, [slotPrefix]);

  const pickVoice = (prefixes: string[]): SpeechSynthesisVoice | undefined => {
    const voices = window.speechSynthesis.getVoices();
    for (const p of prefixes) {
      const v = voices.find((vo) => vo.lang.toLowerCase().replace('_', '-').startsWith(p));
      if (v) return v;
    }
    return undefined;
  };

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setActive(null);
  }, []);

  const speak = useCallback((lang: LangDef) => {
    const parts = collect(lang.source);
    if (parts.length === 0) return; // 經文尚未載入
    window.speechSynthesis.cancel();
    const voice = pickVoice(lang.voicePrefixes);
    parts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang.bcp47;
      if (voice) u.voice = voice;
      u.rate = 0.95;
      if (i === parts.length - 1) u.onend = () => setActive(null);
      window.speechSynthesis.speak(u);
    });
    setActive(lang.key);
  }, [collect]);

  if (!supported) return null;

  return (
    <div className="read-aloud" role="group" aria-label="朗讀本章">
      <span className="ra-label">朗讀</span>
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          className={`ra-btn${active === l.key ? ' ra-btn--on' : ''}`}
          onClick={() => (active === l.key ? stop() : speak(l))}
          aria-pressed={active === l.key}
        >
          {active === l.key ? `■ ${l.label}` : l.label}
        </button>
      ))}
    </div>
  );
}
