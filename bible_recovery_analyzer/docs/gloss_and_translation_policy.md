# Gloss 與翻譯層級政策

## 層級
1. `literal_gloss_en`: 極直譯詞義（token level）
2. `translation_note_zh`: 語法導致的翻譯差異說明
3. `recovery_alignment_note`: 恢復本翻譯對應與翻譯理由
4. `verse_usage`: 本節語境用法

## 原則
- 不把 Recovery 本文存入資料庫。
- 可保存「對齊說明」與「翻譯理由」做研究輸出。
- 以 form-first 為主，必要時補 function-note。
- 對雙重否定、分詞、不定詞、屬格等保留語法說明。

## 真理解釋輸出框架（for GPT）
- 原文形式 -> 直譯 gloss -> 語法說明 -> 恢復本對應理由 -> 真理性詮釋（需標註資料來源層級）
