# Action Rate and Timeout Strategy
- GPT Actions have round-trip timeout constraints (~45s), so `/study` aggregates data in one call.
- Avoid per-token action fan-out; this project aims to return more complete data, not less.
- LSM 50-verse cap: process only first 50 verses and mark `truncated=true` with warning.
- For timeout/429/upstream failures, degrade gracefully and expose diagnostics.
- For payload-size limits, preserve core text/interlinear fields and add truncation notes in diagnostics.
