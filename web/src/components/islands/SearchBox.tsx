import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { normalizeRef, splitOsisRange } from '@/lib/reference';
import { getVerseTokens, lookupWord, lookupLemma } from '@/lib/analyzer';
import { search as fullTextSearch } from '@/lib/search';
import { fetchRecoveryText } from '@/lib/lsmApi';
import { isAudioEnabled } from '@/audio/audioStore';
import { playPageTurn } from '@/audio/webAudioEffects';
import { switchMusic } from '@/audio/musicManager';
import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import VerseResult from './VerseResult';
import PassageResult from './PassageResult';

const LemmaFrequencyChart = lazy(() => import('./LemmaFrequencyChart'));
const AnalyticalCodePie = lazy(() => import('./AnalyticalCodePie'));
const RelatedVersesNetwork = lazy(() => import('./RelatedVersesNetwork'));

type SearchMode = 'verse' | 'word' | 'lemma' | 'search';

// 站方基底路徑（base='/' 時 replace 後為空字串，避免組出 // 開頭的網址）
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// verse_ref（如 Gen.1.1）→ 逐章研經頁對應節錨點
function verseHref(ref: string): string {
  const [book, chapter, verse] = ref.split('.');
  return `${base}/study/${book}/${chapter}#v${verse}`;
}

interface VerseData {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('verse');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [verseResults, setVerseResults] = useState<VerseData[]>([]);
  const [tokenResults, setTokenResults] = useState<Token[]>([]);
  const [searchResults, setSearchResults] = useState<{ refs: string[]; matchedLemmas: string[]; matchedStrongs: string[] } | null>(null);
  const [error, setError] = useState('');
  // 全卷掃描進度（字詞/Lemma/全文搜尋掃 66 卷時顯示「已掃描 X/66 卷」）
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);

  const clearResults = () => {
    setVerseResults([]);
    setTokenResults([]);
    setSearchResults(null);
    setScanProgress(null);
    setError('');
    setSearched(false);
  };

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    clearResults();
    setLoading(true);
    setSearched(true);

    try {
      if (mode === 'verse') {
        const osisRef = normalizeRef(q);
        const refs = splitOsisRange(osisRef);
        const book = refs[0]?.split('.')[0] ?? '';

        // Load book tokens + fetch recovery text in parallel
        const [bookTokens, ...recoveries] = await Promise.all([
          getVerseTokens(refs[0]).then(() => {
            // After first verse loads, show tokens immediately
            return Promise.all(refs.map(ref => getVerseTokens(ref)));
          }),
          ...refs.map(ref => {
            const parts = ref.split('.');
            const displayRef = parts.length >= 3 ? `${parts[0]} ${parts[1]}:${parts.slice(2).join('-')}` : ref;
            return fetchRecoveryText(displayRef);
          }),
        ]);

        setVerseResults(refs.map((ref, i) => ({
          osisRef: ref,
          tokens: bookTokens[i] || [],
          recovery: recoveries[i] || null,
        })));

        // Switch ambient music to match this book
        if (isAudioEnabled() && book) {
          switchMusic(book);
        }

        // Page-turn sound on results appearing
        if (isAudioEnabled()) playPageTurn();
      } else if (mode === 'word') {
        setTokenResults(await lookupWord(q, undefined, (done, total) => setScanProgress({ done, total })));
      } else if (mode === 'lemma') {
        setTokenResults(await lookupLemma(q, undefined, (done, total) => setScanProgress({ done, total })));
      } else if (mode === 'search') {
        const result = await fullTextSearch(q, undefined, (done, total) => setScanProgress({ done, total }));
        setSearchResults(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜尋發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [query, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // 從 URL 的 ?ref= 帶入經文（書卷快速入口連結），於掛載時填入查詢框
  const autoRef = useRef<string | null>(null);
  const didAutoSearch = useRef(false);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      autoRef.current = ref;
      setQuery(ref);
    }
  }, []);

  // query 更新成帶入的 ref 後，自動執行一次經文搜尋（mode 預設即為 verse）
  useEffect(() => {
    if (didAutoSearch.current) return;
    if (autoRef.current && query === autoRef.current) {
      didAutoSearch.current = true;
      handleSearch();
    }
  }, [query, handleSearch]);

  const modes: { value: SearchMode; label: string }[] = [
    { value: 'verse', label: '經文' },
    { value: 'word', label: '字詞' },
    { value: 'lemma', label: 'Lemma' },
    { value: 'search', label: '全文搜尋' },
  ];

  // 圖表用 token：彙整目前查詢結果（經文逐字 + 字詞/Lemma 命中），供 D3 圖即時統計。
  const chartTokens = useMemo(
    () => [...tokenResults, ...verseResults.flatMap((v) => v.tokens)],
    [tokenResults, verseResults],
  );
  // 相關經節網絡需跨多節經文才有邊；統計結果涵蓋的相異經節數。
  const chartVerseCount = useMemo(
    () => new Set(chartTokens.map((t) => t.verse_ref).filter(Boolean)).size,
    [chartTokens],
  );

  return (
    <div className="search-box-container">
      <div className="search-modes">
        {modes.map(m => (
          <button
            key={m.value}
            className={`mode-btn ${mode === m.value ? 'active' : ''}`}
            onClick={() => { setMode(m.value); clearResults(); }}
            aria-pressed={mode === m.value}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="search-input-row">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'verse' ? '輸入經文，如：約1:1 或 Gen1:1-3'
            : mode === 'word' ? '輸入原文或音譯，如：λόγος 或 logos'
            : mode === 'lemma' ? '輸入 lemma，如：λόγος'
            : '輸入任意關鍵字搜尋'}
          className="search-input"
          aria-label="搜尋經文或原文"
        />
        <button onClick={handleSearch} disabled={loading} className="search-btn">
          {loading ? '搜尋中...' : '搜尋'}
        </button>
      </div>

      {error && (
        <div className="error-card card" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* 全卷掃描進度（僅載入中顯示） */}
      {loading && scanProgress && (
        <div className="card"><p className="no-data">搜尋中——已掃描 {scanProgress.done}/{scanProgress.total} 卷…</p></div>
      )}

      {/* Verse mode results */}
      {mode === 'verse' && verseResults.length === 1 && (
        <VerseResult
          osisRef={verseResults[0].osisRef}
          tokens={verseResults[0].tokens}
          recovery={verseResults[0].recovery}
          loading={loading}
        />
      )}
      {mode === 'verse' && verseResults.length > 1 && (
        <PassageResult verses={verseResults} loading={loading} />
      )}

      {/* Token results (word/lemma mode) */}
      {(mode === 'word' || mode === 'lemma') && tokenResults.length > 0 && (
        <div className="token-results">
          <p className="result-count">找到 {tokenResults.length} 筆結果</p>
          <div className="token-card-grid">
            {tokenResults.map((t, i) => (
              <div key={i} className="token-result-item">
                <a className="token-result-ref mono" href={verseHref(t.verse_ref)}>{t.verse_ref}</a>
                <div className="token-card card">
                  <div className="token-header">
                    <span lang={t.strongs_primary.startsWith('H') ? 'he' : 'grc'}
                          dir={t.strongs_primary.startsWith('H') ? 'rtl' : 'ltr'}
                          className="token-surface">{t.surface_form}</span>
                    <span className="token-gloss">{t.literal_gloss_en}</span>
                    {t.strongs_primary
                      ? <a className="token-strongs mono" href={`${base}/lexicon/${t.strongs_primary}`}>{t.strongs_primary}</a>
                      : <span className="token-strongs mono" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 字詞/Lemma 查無結果時的提示（否則畫面像「沒反應」） */}
      {(mode === 'word' || mode === 'lemma') && searched && !loading && tokenResults.length === 0 && !error && (
        <div className="card"><p className="no-data">查無「{query.trim()}」的{mode === 'lemma' ? ' Lemma ' : '字詞'}結果。請確認輸入的是原文（希伯來文／希臘文）或音譯。</p></div>
      )}

      {/* Search results */}
      {mode === 'search' && searchResults && (
        <div className="search-results card">
          <h3>搜尋結果</h3>
          {searchResults.refs.length > 0 && (
            <div className="result-section">
              <h4>匹配經節 ({searchResults.refs.length})</h4>
              <div className="ref-list">{searchResults.refs.map(r => <a key={r} className="ref-tag mono" href={verseHref(r)}>{r}</a>)}</div>
            </div>
          )}
          {searchResults.matchedLemmas.length > 0 && (
            <div className="result-section">
              <h4>匹配 Lemma ({searchResults.matchedLemmas.length})</h4>
              <div className="ref-list">{searchResults.matchedLemmas.map(l => <span key={l} className="ref-tag">{l}</span>)}</div>
            </div>
          )}
          {searchResults.matchedStrongs.length > 0 && (
            <div className="result-section">
              <h4>匹配 Strong's ({searchResults.matchedStrongs.length})</h4>
              <div className="ref-list">{searchResults.matchedStrongs.map(s => <a key={s} className="ref-tag mono" href={`${base}/lexicon/${s}`}>{s}</a>)}</div>
            </div>
          )}
          {searchResults.refs.length === 0 && <p className="no-data">查無結果。</p>}
        </div>
      )}

      {/* D3 charts — 視覺化「目前查詢結果」的 token（高頻 lemma、詞性分布）。
          原本讀全站空的 tokens.json 致圖表全空白；改用結果 token 即時統計。 */}
      {chartTokens.length > 0 && (
        <div className="d3-charts-section" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914' }}>載入圖表中...</div>}>
              <LemmaFrequencyChart tokens={chartTokens} />
            </Suspense>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914' }}>載入圖表中...</div>}>
              <AnalyticalCodePie tokens={chartTokens} />
            </Suspense>
          </div>
        </div>
      )}

      {/* 相關經節網絡：結果跨 ≥2 節經文時才有共享 Lemma 的連線可畫。 */}
      {chartVerseCount >= 2 && (
        <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}>
          <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914' }}>載入圖表中...</div>}>
            <RelatedVersesNetwork tokens={chartTokens} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
