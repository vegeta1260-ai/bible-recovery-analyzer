import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
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

type SearchMode = 'verse' | 'word' | 'lemma' | 'search' | 'morphology';

interface VerseData {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('verse');
  const [loading, setLoading] = useState(false);
  const [verseResults, setVerseResults] = useState<VerseData[]>([]);
  const [tokenResults, setTokenResults] = useState<Token[]>([]);
  const [searchResults, setSearchResults] = useState<{ refs: string[]; matchedLemmas: string[]; matchedStrongs: string[] } | null>(null);
  const [error, setError] = useState('');
  const audioStarted = useRef(false);

  // Start audio on first user interaction with this component
  const ensureAudioStarted = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
  }, []);

  const clearResults = () => {
    setVerseResults([]);
    setTokenResults([]);
    setSearchResults(null);
    setError('');
  };

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    ensureAudioStarted();
    clearResults();
    setLoading(true);

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
        setTokenResults(await lookupWord(q));
      } else if (mode === 'lemma') {
        setTokenResults(await lookupLemma(q));
      } else if (mode === 'search' || mode === 'morphology') {
        const result = await fullTextSearch(q);
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

  const modes: { value: SearchMode; label: string }[] = [
    { value: 'verse', label: '經文' },
    { value: 'word', label: '字詞' },
    { value: 'lemma', label: 'Lemma' },
    { value: 'search', label: '全文搜尋' },
    { value: 'morphology', label: '詞形' },
  ];

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
          onFocus={ensureAudioStarted}
          placeholder={mode === 'verse' ? '輸入經文，如：約1:1 或 Gen1:1-3'
            : mode === 'word' ? '輸入原文或音譯，如：λόγος 或 logos'
            : mode === 'lemma' ? '輸入 lemma，如：λόγος'
            : mode === 'morphology' ? '輸入分析碼或詞性，如：NOM 或 noun'
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
                <span className="token-result-ref mono">{t.verse_ref}</span>
                <div className="token-card card">
                  <div className="token-header">
                    <span lang={t.strongs_primary.startsWith('H') ? 'he' : 'grc'}
                          dir={t.strongs_primary.startsWith('H') ? 'rtl' : 'ltr'}
                          className="token-surface">{t.surface_form}</span>
                    <span className="token-gloss">{t.literal_gloss_en}</span>
                    <span className="token-strongs mono">{t.strongs_primary}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {(mode === 'search' || mode === 'morphology') && searchResults && (
        <div className="search-results card">
          <h3>搜尋結果</h3>
          {searchResults.refs.length > 0 && (
            <div className="result-section">
              <h4>匹配經節 ({searchResults.refs.length})</h4>
              <div className="ref-list">{searchResults.refs.map(r => <span key={r} className="ref-tag mono">{r}</span>)}</div>
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
              <div className="ref-list">{searchResults.matchedStrongs.map(s => <span key={s} className="ref-tag mono">{s}</span>)}</div>
            </div>
          )}
          {searchResults.refs.length === 0 && <p className="no-data">查無結果。</p>}
        </div>
      )}

      {/* D3 charts — shown when there are any results, desktop only */}
      {(verseResults.length > 0 || tokenResults.length > 0 || searchResults !== null) && (
        <div className="d3-charts-section" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914' }}>載入圖表中...</div>}>
              <LemmaFrequencyChart />
            </Suspense>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914' }}>載入圖表中...</div>}>
              <AnalyticalCodePie />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
