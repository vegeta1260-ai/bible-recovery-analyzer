# Technical Architecture (v0.2)

## 模組
- `models/db.py`: Token/Lexicon 升級欄位
- `services/analyzer.py`: interlinear + legend + morphology search
- `services/analytical_codes.py`: code 解析與圖例
- `services/strongs.py`: Strong's 正規化
- `services/ministry_resources.py`: 資源指向索引
- `routers/api.py`: 新增模式化輸出與擴充端點

## 資料流
1. `reference.normalize_ref`
2. `AnalyzerService` 取 token/lexicon
3. `RecoveryTextClient` runtime 取 recovery line
4. 組裝 mode-specific response (`standard/detailed/interlinear/study_card/compact`)

## 可替換性
- SQLite -> PostgreSQL（SQLAlchemy）
- sample fixtures -> 全量 ETL
- `/resources` 可切換到授權內容索引服務

## 安全與版權
- 不保存 recovery text
- attribution 強制輸出
- source material 狀態文件化（missing/confirmed/inferred）
