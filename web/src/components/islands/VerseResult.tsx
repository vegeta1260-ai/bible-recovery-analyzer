import { useState } from 'react';
import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import InterlinearView from './InterlinearView';
import TokenCard from './TokenCard';
import MiracleEffectRouter from '@/effects/MiracleEffectRouter';
import type { MiracleContext } from '@/effects/MiracleEffectRouter';

interface Props {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
  loading?: boolean;
}

export default function VerseResult({ osisRef, tokens, recovery, loading }: Props) {
  const parts = osisRef.split('.');
  const displayRef = parts.length >= 3 ? `${parts[0]} ${parts[1]}:${parts[2]}` : osisRef;

  const [effectDone, setEffectDone] = useState(false);
  const miracleCtx: MiracleContext = {
    book: parts[0] ?? '',
    ref: osisRef,
    normalizedForms: tokens.map(t => t.normalized_form),
  };

  return (
    <div className="verse-result">
      {/* Miracle effect overlay — renders and removes itself on completion */}
      {!effectDone && tokens.length > 0 && (
        <MiracleEffectRouter
          context={miracleCtx}
          onComplete={() => setEffectDone(true)}
        />
      )}
      <h2 className="verse-ref">{displayRef}</h2>

      {recovery?.error && (
        <div className="error-card card" role="alert">
          <p>恢復本經文暫時無法載入，請稍後再試。</p>
          <p className="error-detail">{recovery.errorMessage}</p>
        </div>
      )}

      {loading && !recovery && (
        <div className="skeleton" style={{ height: '3rem', marginBottom: '1rem' }} />
      )}

      {recovery && !recovery.error && (
        <div className="recovery-block card">
          {recovery.verses.length > 0
            ? recovery.verses.map((v, i) => (
                <p key={i} className="recovery-verse-text">
                  {v.textEn && <span className="rec-en">{v.textEn}</span>}
                  <span className="rec-zh">{v.text}</span>
                </p>
              ))
            : recovery.text && <p className="recovery-verse-text">{recovery.text}</p>
          }
          {recovery.copyright && (
            <p className="recovery-copyright">{recovery.copyright}</p>
          )}
        </div>
      )}

      {tokens.length > 0 && (
        <>
          <InterlinearView
            tokens={tokens}
            recoveryText={recovery?.text || ''}
          />

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>原文研究卡</h3>
          <div className="token-card-grid">
            {tokens.map((t, i) => (
              <TokenCard key={i} token={t} />
            ))}
          </div>
        </>
      )}

      {tokens.length === 0 && !loading && (
        <p className="no-data">此經節尚無原文 token 資料（MVP 資料範圍有限）。</p>
      )}
    </div>
  );
}
