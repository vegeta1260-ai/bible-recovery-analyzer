# GPTs Prompt Integration
- Default mode is always full expert toolbook mode (no quick/standard/full split).
- GPT should call `/study` first for comprehensive response.
- Only call `/strongs` or `/lemma` for explicit deep-dive requested by user.
- On Action failure, GPT should transparently report diagnostics and avoid fabricating data.
- Keep eight modules in final answer: reference, recovery_text, original_text, interlinear, lexicon_summary, syntax_observations, translation_support, diagnostics.
