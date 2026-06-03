import { useEffect, useState } from 'react';
import { fetchRecoveryText } from '@/lib/lsmApi';

interface Props {
  /** LSM 可辨識的整章引用，如 "John.3" */
  chapterRef: string;
  /** 每節恢復本 slot 的 id 前綴，如 "rec-John-3-"；實際 id 為 prefix + 節號 */
  slotPrefix: string;
}

/**
 * 取整章恢復本經文，runtime 填入各節靜態 slot（漸進增強）。
 * 恢復本為 LSM 版權、不離線打包；靜態頁只放公版原文，恢復本由此 island 疊上。
 */
export default function ChapterRecovery({ chapterRef, slotPrefix }: Props) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetchRecoveryText(chapterRef).then((res) => {
      if (cancelled) return;
      if (res.error || res.verses.length === 0) {
        setStatus('error');
        return;
      }
      for (const v of res.verses) {
        const m = v.ref.match(/:(\d+)/) ?? v.ref.match(/(\d+)\s*$/);
        if (!m) continue;
        const el = document.getElementById(`${slotPrefix}${m[1]}`);
        if (el) el.innerHTML = `<strong>恢復本：</strong>${v.text}`;
      }
      setStatus('done');
    });
    return () => { cancelled = true; };
  }, [chapterRef, slotPrefix]);

  if (status === 'done') return null;
  return (
    <p aria-live="polite" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>
      {status === 'loading' ? '恢復本經文載入中…' : '恢復本經文暫時無法載入，以下為原文逐字對照。'}
    </p>
  );
}
