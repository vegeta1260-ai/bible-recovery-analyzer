import type { Token } from '@/lib/analyzer';

interface Props {
  tokens: Token[];
  recoveryText: string;
}

export default function InterlinearView({ tokens, recoveryText }: Props) {
  if (tokens.length === 0) return null;

  return (
    <div className="interlinear-view card">
      <h3 className="interlinear-title">逐字對照</h3>
      <div className="interlinear-scroll">
        <table className="interlinear-table" role="table" aria-label="逐字對照表">
          <tbody>
            <tr className="row-original">
              <th>原文</th>
              {tokens.map((t, i) => {
                const isHebrew = t.strongs_primary.startsWith('H');
                return (
                  <td key={i} lang={isHebrew ? 'he' : 'grc'} dir={isHebrew ? 'rtl' : 'ltr'}>
                    {t.surface_form}
                  </td>
                );
              })}
            </tr>
            <tr className="row-strongs">
              <th>Strong's</th>
              {tokens.map((t, i) => (
                <td key={i} className="mono">
                  {t.strongs_primary}
                  {t.strongs_secondary ? `|${t.strongs_secondary}` : ''}
                </td>
              ))}
            </tr>
            <tr className="row-code">
              <th>分析碼</th>
              {tokens.map((t, i) => (
                <td key={i} className="mono">{t.analytical_code_raw}</td>
              ))}
            </tr>
            <tr className="row-gloss">
              <th>Gloss</th>
              {tokens.map((t, i) => (
                <td key={i}>{t.literal_gloss_en}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {recoveryText && (
        <div className="recovery-text">
          <strong>恢復本：</strong>{recoveryText}
        </div>
      )}
    </div>
  );
}
