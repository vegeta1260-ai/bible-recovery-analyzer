import { useEffect, useState } from 'react';
import { fetchRecoveryText } from '@/lib/lsmApi';
import { recoveryVerseToOrigSlots, chapterTitleSlots } from '@/lib/versification';

interface Props {
  /** LSM 可辨識的整章引用，如 "John.3" */
  chapterRef: string;
  /** 每節恢復本 slot 的 id 前綴，如 "rec-John-3-"；實際 id 為 prefix + 節號 */
  slotPrefix: string;
  /** OSIS 書卷代碼，用於原文↔恢復本節對映（如詩篇題注錯位） */
  osis: string;
  /** 章號，用於節對映 */
  chapter: number;
}

/**
 * 取整章恢復本經文，runtime 填入各節靜態 slot（漸進增強）。
 * 恢復本為 LSM 版權、不離線打包；靜態頁只放公版原文，恢復本由此 island 疊上。
 */
export default function ChapterRecovery({ chapterRef, slotPrefix, osis, chapter }: Props) {
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
        // 英文上、中文下（中文以 secondary 色區隔兩行）
        const en = v.textEn ? `<span class="rec-en">${v.textEn}</span>` : '';
        const html = `<strong>恢復本：</strong>${en}<span class="rec-zh">${v.text}</span>`;
        // 把恢復本節號轉成正確的原文 slot（詩篇題注 offset、3John 末節合併、新約章末多節等）
        for (const slot of recoveryVerseToOrigSlots(osis, chapter, Number(m[1]))) {
          const el = document.getElementById(`${slotPrefix}${slot}`);
          if (!el) continue;
          if (el.dataset.recFilled) {
            // 多個恢復本節對同一原文 slot（如希臘長句拆兩節、頌讚併入）→ 附加，不覆蓋
            const en2 = v.textEn ? ` <span class="rec-en">${v.textEn}</span>` : '';
            el.innerHTML += `${en2}<span class="rec-zh"> ${v.text}</span>`;
          } else {
            el.innerHTML = html;
            el.dataset.recFilled = '1';
          }
        }
      }
      // 被恢復本空出的題注 slot（如詩篇希伯來題注）標示，不留空也不填錯位經文
      for (const t of chapterTitleSlots(osis, chapter)) {
        const el = document.getElementById(`${slotPrefix}${t}`);
        if (el && !el.innerHTML.trim()) {
          el.innerHTML = '<strong>恢復本：</strong><span class="rec-zh" style="color:var(--color-text-muted)">〔詩篇題注，恢復本列為標題不另編節〕</span>';
        }
      }
      setStatus('done');
    });
    return () => { cancelled = true; };
  }, [chapterRef, slotPrefix, osis, chapter]);

  if (status === 'done') return null;
  return (
    <p aria-live="polite" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>
      {status === 'loading' ? '恢復本經文載入中…' : '恢復本經文暫時無法載入，以下為原文逐字對照。'}
    </p>
  );
}
