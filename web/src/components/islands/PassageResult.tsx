import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import VerseResult from './VerseResult';

interface VerseData {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
}

interface Props {
  verses: VerseData[];
  loading?: boolean;
}

export default function PassageResult({ verses, loading }: Props) {
  if (verses.length === 0 && !loading) {
    return <p className="no-data">查無資料。</p>;
  }

  return (
    <div className="passage-result">
      <p className="passage-summary">
        共 {verses.length} 節，
        {verses.reduce((sum, v) => sum + v.tokens.length, 0)} 個 token。
      </p>
      {verses.map((v, i) => (
        <VerseResult
          key={i}
          osisRef={v.osisRef}
          tokens={v.tokens}
          recovery={v.recovery}
          loading={loading}
        />
      ))}
    </div>
  );
}
