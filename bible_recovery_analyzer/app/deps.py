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
