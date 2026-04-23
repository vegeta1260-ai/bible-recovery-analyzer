# Interlinear / Analinear 設計

## 目標
提供多層輸出：
1. 原文行
2. Strong's 行
3. Analytical code 行
4. Gloss 行
5. Recovery Version 行（runtime only）

## 輸出模式
- `standard`: 研究卡 + 基本 interlinear
- `detailed`: 完整 token features + grammar note
- `interlinear`: 以 line 為主
- `study_card`: 研究欄位優先
- `compact`: 精簡 token 摘要

## 回應層級
### Verse
- `interlinear.original_text_line`
- `interlinear.strongs_line`
- `interlinear.analytical_code_line`
- `interlinear.gloss_line`
- `interlinear.recovery_version_line`

### Passage
- `verses[]` 逐節結果
- `passage_summary` 段落摘要
- `token_summary` 詞級統計

## 合規
- Recovery Version line 僅 runtime 取得
- 不保存 Recovery 文字到 DB/fixture
