import { useState, useEffect, useCallback } from 'react';
import {
  initAudioStore,
  isAudioEnabled,
  toggleAudio,
  subscribeAudio,
} from '@/audio/audioStore';
import { playBell } from '@/audio/webAudioEffects';
import { setMusicMuted } from '@/audio/musicManager';

export default function AudioController() {
  const [enabled, setEnabled] = useState(false); // 預設靜音，見 audioStore
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    initAudioStore();
    setEnabled(isAudioEnabled());
    const unsub = subscribeAudio(val => setEnabled(val));
    return unsub;
  }, []);

  // M key shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === 'm' || e.key === 'M'
      ) {
        // Ignore if focus is in an editable/interactive element
        const el = e.target as HTMLElement;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return;
        handleToggle();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(() => {
    const next = toggleAudio();
    setMusicMuted(!next);
    if (next) {
      playBell(440);
      setAnnouncement('音效已開啟');
    } else {
      setAnnouncement('音效已靜音');
    }
  }, []);

  return (
    <div className="audio-controller">
      <button
        className={`audio-btn${enabled ? ' audio-btn--on' : ' audio-btn--off'}`}
        onClick={handleToggle}
        aria-label={enabled ? '靜音（按 M 鍵）' : '開啟音效（按 M 鍵）'}
        title={enabled ? '靜音 [M]' : '開啟音效 [M]'}
      >
        {enabled ? (
          // Speaker on SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          // Speaker muted SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>
      {/* Accessible live region for state announcements */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
