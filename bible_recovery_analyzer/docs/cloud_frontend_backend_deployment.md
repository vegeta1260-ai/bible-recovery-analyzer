# Cloud Frontend/Backend Deployment
- GitHub Pages hosts static frontend only.
- FastAPI backend runs on cloud host and exposes HTTPS API.
- Frontend must read API base URL from deploy-time config (no localhost hardcode).
- Backend CORS must allow `https://vegeta1260-ai.github.io` and project path origin.
- Store LSM/ACTION secrets only in backend env vars.
- Host MACULA DB on persistent storage (volume or managed DB).
