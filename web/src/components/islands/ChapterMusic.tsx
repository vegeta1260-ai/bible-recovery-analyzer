import { useEffect } from 'react';
import { switchMusic, setMusicMuted } from '@/audio/musicManager';
import { initAudioStore, isAudioEnabled, subscribeAudio } from '@/audio/audioStore';

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
    initAudioStore(); // 接上跨島同步 + 讀 localStorage（本島自己的單例需初始化）
    if (isAudioEnabled()) {
      switchMusic(osis);
      setMusicMuted(false);
    }
    const unsub = subscribeAudio((enabled) => {
      if (enabled) {
        switchMusic(osis);    // 切到本卷曲目（同型別則內部略過，音樂續播）
        setMusicMuted(false); // 確保 unmute（switchMusic 同型別 return 時不會自己 unmute）
      } else {
        setMusicMuted(true);  // 關閉：靜音本島正在播的曲目
      }
    });
    return unsub;
  }, [osis]);

  // 隱藏標記：無視覺輸出，但讓 client:idle 有節點可水合、且便於驗證已掛載。
  return <span data-chapter-music={osis} hidden />;
}
