# GPT Actions Integration Guide
- Primary endpoint: `/study` for complete expert payload.
- HTTPS public endpoint is required; `127.0.0.1` cannot be reached by GPT Actions cloud runtime.
- Test with Cloudflare Quick Tunnel: run API locally, then `cloudflared tunnel --url http://127.0.0.1:8000`.
- Import `openapi.yaml` into GPT Builder Actions.
- Configure Actions auth with backend `ACTION_AUTH_*`; keep `ACTION_API_KEY` separate from LSM token.
- Never hardcode any secret in repo.
