import { useEffect } from 'react';
import { switchMusic } from '@/audio/musicManager';
import { isAudioEnabled, subscribeAudio } from '@/audio/audioStore';

interface Props {
  /** OSIS 書卷代碼，用於選對應的書卷類型配樂 */
  osis: string;
}

/**
 * 逐章頁配樂：把背景音樂切到該書卷類型的曲目。
 * 先前只有 SearchBox 會 switchMusic，逐章頁不會切（停在 default 或前一卷）。
 * switchMusic 內部已尊重靜音預設（未開啟音效時不播）；此外訂閱音效開關，
 * 使用者在本頁「開啟音效」時也即時切到本卷曲目（否則 _current 為空、開啟後無聲）。
 */
export default function ChapterMusic({ osis }: Props) {
  useEffect(() => {
    if (isAudioEnabled()) switchMusic(osis);
    const unsub = subscribeAudio((enabled) => {
      if (enabled) switchMusic(osis);
    });
    return unsub;
  }, [osis]);

  // 隱藏標記：無視覺輸出，但讓 client:idle 有節點可水合、且便於驗證已掛載。
  return <span data-chapter-music={osis} hidden />;
}
