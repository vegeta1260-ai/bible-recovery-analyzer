# Analytical Code System

## 狀態標記
- **confirmed from accessible material**：由你提供掃描圖可直接辨識（N/V/A/D/P、格、數、性、人稱、時態、語氣、語態、M/P、crasis）。
- **inferred from structure**：從 Analinear 編碼慣例推定（form-priority, exception annotations）。
- **pending verification from source material**：需完整書本文本比對的細節規則。

## 核心設計
1. form-first
   - 先依形態分類（詞性、格、數、性、時態、語態、語氣）
2. function exceptions
   - 在 `grammar_explanation` 標示功能性例外
3. M/P merged
   - 允許 `M/P` 中被動合併
4. Crasis / elided forms
   - 使用 secondary strongs + `X` 類別註記

## 支援欄位
- `analytical_code_raw`
- `analytical_code_expanded`
- `part_of_speech`
- `morphology_features`
- `grammar_explanation`

## 語法說明層（目前）
- 定冠詞
- 分詞
- 不定詞
- 歷史現在式
- imperfect/aorist/perfect 翻譯傾向
- adverbial genitive
- neuter plural subject + singular verb
- improper prepositions
- vocative
- prononominal adjectives
- Hebrew/Aramaic loanwords in Greek context
- OT quotation marker
