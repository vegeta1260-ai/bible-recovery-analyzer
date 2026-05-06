import { useState } from 'react';
import type { Token } from '@/lib/analyzer';
import { parseAnalyticalCode } from '@/lib/analyticalCodes';

interface Props {
  token: Token;
  defaultExpanded?: boolean;
}

export default function TokenCard({ token, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const codeInfo = parseAnalyticalCode(token.analytical_code_raw);
  const isHebrew = token.strongs_primary.startsWith('H');
  const langTag = isHebrew ? 'he' : 'grc';
  const langDir = isHebrew ? 'rtl' : 'ltr';

  return (
    <div className="token-card card" onClick={() => setExpanded(!expanded)}>
      <div className="token-header">
        <span lang={langTag} dir={langDir} className="token-surface">
          {token.surface_form}
        </span>
        <span className="token-gloss">{token.literal_gloss_en}</span>
        <span className="token-strongs mono">{token.strongs_primary}</span>
      </div>

      {expanded && (
        <div className="token-detail">
          <dl className="token-fields">
            <dt>正規形式</dt><dd lang={langTag} dir={langDir}>{token.normalized_form}</dd>
            <dt>Lemma</dt><dd lang={langTag} dir={langDir}>{token.lemma}</dd>
            <dt>詞性</dt><dd>{token.part_of_speech}</dd>
            <dt>分析碼</dt>
            <dd className="mono">
              {token.analytical_code_raw}
              <span className="code-expanded">
                {Object.entries(codeInfo.expanded).map(([k, v]) => (
                  <span key={k} className="code-tag">{k}: {v}</span>
                ))}
              </span>
            </dd>
            {token.strongs_secondary && (
              <><dt>次級 Strong's</dt><dd className="mono">{token.strongs_secondary}</dd></>
            )}
            <dt>音譯</dt><dd>{token.pronunciation_transliteration}</dd>
            <dt>注音</dt><dd>{token.pronunciation_bopomofo}</dd>
            <dt>中文翻譯注記</dt><dd>{token.translation_note_zh}</dd>
            <dt>恢復本對齊</dt><dd>{token.recovery_alignment_note}</dd>
            <dt>文法解釋</dt><dd>{token.grammar_explanation}</dd>
            <dt>經文用法</dt><dd>{token.verse_usage}</dd>
            <dt>來源層</dt><dd className="mono">{token.source_layer}</dd>
            {token.is_ot_quote && (
              <><dt>舊約引用</dt><dd>是</dd></>
            )}
          </dl>
        </div>
      )}

      <button
        className="expand-toggle"
        aria-label={expanded ? '收合詳細資訊' : '展開詳細資訊'}
        aria-expanded={expanded}
      >
        {expanded ? '收合' : '展開'}
      </button>
    </div>
  );
}
