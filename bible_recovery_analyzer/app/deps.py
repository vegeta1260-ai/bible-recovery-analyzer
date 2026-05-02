from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.models.db import Database
from app.services.analyzer import AnalyzerService
from app.services.recovery_api import RecoveryTextClient

settings = get_settings()
_db = Database(settings.sqlite_path)


def init_db() -> None:
    _db.create_all()


def get_analyzer_service() -> AnalyzerService:
    return AnalyzerService(_db.session_local)


def get_recovery_client() -> RecoveryTextClient:
    return RecoveryTextClient(settings)


def require_action_auth(authorization: str | None = Header(default=None)) -> None:
    if not settings.action_auth_enabled or settings.action_auth_mode == "none":
        return
    if settings.action_auth_mode != "bearer":
        raise HTTPException(status_code=500, detail="unsupported action auth mode")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer authorization")
    incoming = authorization.removeprefix("Bearer ").strip()
    if not incoming or incoming != settings.action_api_key:
        raise HTTPException(status_code=401, detail="invalid action api key")
