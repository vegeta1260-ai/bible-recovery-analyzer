/**
 * Howler.js ambient music manager.
 * Maps Bible book types to music styles and handles crossfade between tracks.
 * Audio files are placeholders — replace with real 1-minute loops in public/audio/.
 */

import { Howl } from 'howler';
import { isAudioEnabled } from './audioStore';

export type BookType = 'pentateuch' | 'history' | 'wisdom' | 'prophecy' | 'gospel' | 'epistle' | 'apocalypse' | 'default';

// Map OSIS book abbreviations to book types
const BOOK_TYPE_MAP: Record<string, BookType> = {
  // Pentateuch
  Gen: 'pentateuch', Exod: 'pentateuch', Lev: 'pentateuch', Num: 'pentateuch', Deut: 'pentateuch',
  // History
  Josh: 'history', Judg: 'history', Ruth: 'history', '1Sam': 'history', '2Sam': 'history',
  '1Kgs': 'history', '2Kgs': 'history', '1Chr': 'history', '2Chr': 'history',
  Ezra: 'history', Neh: 'history', Esth: 'history',
  // Wisdom
  Job: 'wisdom', Ps: 'wisdom', Prov: 'wisdom', Eccl: 'wisdom', Song: 'wisdom',
  // Prophecy
  Isa: 'prophecy', Jer: 'prophecy', Lam: 'prophecy', Ezek: 'prophecy', Dan: 'prophecy',
  Hos: 'prophecy', Joel: 'prophecy', Amos: 'prophecy', Obad: 'prophecy', Jonah: 'prophecy',
  Mic: 'prophecy', Nah: 'prophecy', Hab: 'prophecy', Zeph: 'prophecy', Hag: 'prophecy',
  Zech: 'prophecy', Mal: 'prophecy',
  // Gospel
  Matt: 'gospel', Mark: 'gospel', Luke: 'gospel', John: 'gospel', Acts: 'gospel',
  // Epistle
  Rom: 'epistle', '1Cor': 'epistle', '2Cor': 'epistle', Gal: 'epistle', Eph: 'epistle',
  Phil: 'epistle', Col: 'epistle', '1Thess': 'epistle', '2Thess': 'epistle',
  '1Tim': 'epistle', '2Tim': 'epistle', Titus: 'epistle', Phlm: 'epistle',
  Heb: 'epistle', Jas: 'epistle', '1Pet': 'epistle', '2Pet': 'epistle',
  '1John': 'epistle', '2John': 'epistle', '3John': 'epistle', Jude: 'epistle',
  // Apocalypse
  Rev: 'apocalypse',
};

// Audio file paths — use import.meta.env.BASE_URL at runtime
const BASE = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : '';

// 方向確認版：8 類書卷暫全指同一段公共領域素歌（Veni Sancte Spiritus，
// Wikimedia Commons，作者 Membeth 釋出公共領域），供確認「素歌方向」是否合適。
// 確認後再為 8 類書卷分化不同的開放授權聖樂曲目（舊 ambient-*.mp3 暫保留未用）。
const CHANT = `${BASE}/audio/ambient-chant.mp3`;
const TRACK_MAP: Record<BookType, string> = {
  pentateuch: CHANT,
  history:    CHANT,
  wisdom:     CHANT,
  prophecy:   CHANT,
  gospel:     CHANT,
  epistle:    CHANT,
  apocalypse: CHANT,
  default:    CHANT,
};

const FADE_DURATION = 2000; // ms

let _current: Howl | null = null;
let _currentType: BookType | null = null;

export function getBookType(osisBook: string): BookType {
  return BOOK_TYPE_MAP[osisBook] ?? 'default';
}

/** Switch ambient music to match the given OSIS book abbreviation. */
export function switchMusic(osisBook: string): void {
  if (!isAudioEnabled()) return;

  const bookType = getBookType(osisBook);
  if (bookType === _currentType) return;

  const trackSrc = TRACK_MAP[bookType];

  const next = new Howl({
    src: [trackSrc],
    loop: true,
    volume: 0,
    // 用 Web Audio（非 html5）：背景循環樂在使用者手勢解鎖 AudioContext 後播放可靠，
    // 且無 html5 模式的「HTML5 Audio pool exhausted / locked audio object」問題（會導致無聲）。
    html5: false,
    onloaderror: () => {
      // Audio file missing (placeholder) — silently ignore
    },
  });

  // Fade out current track（fade 完 stop 並 unload 釋放資源，避免重複切換累積）
  if (_current) {
    const prev = _current;
    prev.fade(prev.volume() as number, 0, FADE_DURATION);
    setTimeout(() => { prev.stop(); prev.unload(); }, FADE_DURATION + 50);
  }

  next.play();
  next.fade(0, 0.35, FADE_DURATION);

  _current = next;
  _currentType = bookType;
}

/** Mute/unmute without stopping. */
export function setMusicMuted(muted: boolean): void {
  if (!_current) return;
  if (muted) {
    _current.fade(_current.volume() as number, 0, 800);
  } else {
    _current.fade(_current.volume() as number, 0.35, 800);
  }
}

/** Stop all music immediately. */
export function stopMusic(): void {
  if (_current) {
    _current.stop();
    _current = null;
    _currentType = null;
  }
}
