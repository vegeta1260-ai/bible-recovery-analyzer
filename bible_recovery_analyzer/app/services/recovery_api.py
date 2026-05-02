from app.core.config import Settings
from app.services.recovery.manager import RecoveryServiceManager


class RecoveryTextClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.manager = RecoveryServiceManager(settings)

    async def get_verse_text(self, osis_ref: str, request_ref: str | None = None):
        return await self.manager.get_verse_text(osis_ref, request_ref)

    def provider_status(self) -> dict:
        return self.manager.provider_status()
