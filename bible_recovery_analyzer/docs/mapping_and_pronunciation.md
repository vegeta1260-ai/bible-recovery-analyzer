# 經卷與發音規則（v0.2）

## 經卷對照
- NT 27 卷 + OT 示範卷對照已放入 `BOOK_ROWS`
- `/books` 可輸出 OSIS / 英文 / 中文 / aliases

## 音譯 -> 注音式近似發音
- `transliteration_to_zhuyin_like` 依語言分流
- Hebrew 規則：處理 ʾ、母音長短、sh/ch 等
- Greek 規則：處理 digraph（th/ph/ch/ps/ou/ai...）

## 注意
- 注音欄位為朗讀輔助，不是學術 IPA
- 後續可接可配置規則檔（yaml/json）
