# Product Spec — 聖經恢復本及原文字義解析（Prototype v0.2）

## 1) 目標
建立可供 ChatGPT Actions 呼叫的後端 API，支援：
- 恢復本 runtime 文字層
- OT/NT 原文詞形層
- Interlinear / study card 多模式輸出

## 2) 核心功能
- `/verse`, `/passage`, `/interlinear`
- `/word`, `/strongs/{id}`, `/lemma`, `/search`
- `/legend`, `/codes/{analytical_code}`, `/books`, `/morphology/search`
- `/resources`（肯定與否定、希伯來文研究資源索引）

## 3) 固定研究欄位（token）
- surface_form / normalized_form / lemma
- strongs_primary / strongs_secondary
- analytical_code_raw / analytical_code_expanded
- part_of_speech / morphology_features
- literal_gloss_en / translation_note_zh / recovery_alignment_note
- pronunciation_transliteration / pronunciation_bopomofo
- verse_usage / grammar_explanation / ot_quote_marker

## 4) 合規
- Recovery 本文僅 runtime 取得，不入庫
- 回應帶 attribution
- 文件明確標示 confirmed/inferred/pending

## 5) 成功標準
- mock mode 可完整展示 interlinear + study card
- schema 支援後續直升正式 LSM key
- 測試案例 >=20，含 snapshots
