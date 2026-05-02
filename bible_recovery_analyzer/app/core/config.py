from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bible Recovery Version & Original Language Analyzer"

    recovery_provider: Literal["mock", "lsm_api", "web_fallback"] = Field(
        default="mock", alias="RECOVERY_PROVIDER"
    )

    recovery_api_base_url: str = Field(
        default="https://api.lsm.example/recovery-text", alias="RECOVERY_API_BASE_URL"
    )
    recovery_api_key: str = Field(default="", alias="RECOVERY_API_KEY")
    recovery_api_app_id: str = Field(default="", alias="RECOVERY_API_APP_ID")
    recovery_api_auth_mode: Literal["bearer", "header", "query", "none", "basic"] = Field(
        default="bearer", alias="RECOVERY_API_AUTH_MODE"
    )
    recovery_api_token: str = Field(default="", alias="RECOVERY_API_TOKEN")
    recovery_api_auth_header_name: str = Field(
        default="Authorization", alias="RECOVERY_API_AUTH_HEADER_NAME"
    )
    recovery_api_auth_query_param: str = Field(default="token", alias="RECOVERY_API_AUTH_QUERY_PARAM")
    recovery_api_ref_param: str = Field(default="String", alias="RECOVERY_API_REF_PARAM")
    recovery_api_output_param: str = Field(default="Out", alias="RECOVERY_API_OUTPUT_PARAM")
    recovery_api_output: str = Field(default="json", alias="RECOVERY_API_OUTPUT")
    recovery_api_input_param: str = Field(default="In", alias="RECOVERY_API_INPUT_PARAM")
    recovery_api_input_mode: str = Field(default="", alias="RECOVERY_API_INPUT_MODE")
    recovery_api_timeout_seconds: float = Field(default=12.0, alias="RECOVERY_API_TIMEOUT")
    recovery_retry_attempts: int = Field(default=2, alias="RECOVERY_RETRY_ATTEMPTS")
    simulate_lsm_rejection: bool = Field(default=False, alias="SIMULATE_LSM_REJECTION")
    recovery_enable_web_fallback_from_lsm: bool = Field(
        default=True, alias="RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM"
    )

    recovery_web_base_url: str = Field(default="", alias="RECOVERY_WEB_BASE_URL")
    recovery_web_fetch_enabled: bool = Field(default=False, alias="RECOVERY_WEB_FETCH_ENABLED")
    recovery_web_user_agent: str = Field(
        default="BibleRecoveryAnalyzer/0.3 (+runtime-fallback-testing)",
        alias="RECOVERY_WEB_USER_AGENT",
    )
    recovery_web_timeout_seconds: float = Field(default=10.0, alias="RECOVERY_WEB_TIMEOUT_SECONDS")
    recovery_web_route_template: str = Field(default="verse/{ref}", alias="RECOVERY_WEB_ROUTE_TEMPLATE")
    recovery_web_selector: str = Field(default="", alias="RECOVERY_WEB_SELECTOR")
    recovery_web_extract_marker_start: str = Field(default="", alias="RECOVERY_WEB_EXTRACT_MARKER_START")
    recovery_web_extract_marker_end: str = Field(default="", alias="RECOVERY_WEB_EXTRACT_MARKER_END")
    recovery_web_max_chars: int = Field(default=600, alias="RECOVERY_WEB_MAX_CHARS")

    action_api_key: str = Field(default="", alias="ACTION_API_KEY")
    action_auth_enabled: bool = Field(default=False, alias="ACTION_AUTH_ENABLED")
    action_auth_mode: Literal["bearer", "none"] = Field(default="none", alias="ACTION_AUTH_MODE")

    sqlite_path: str = Field(default="./data/bible_analyzer.db", alias="SQLITE_PATH")
    default_recovery_attribution: str = Field(
        default=(
            "恢復本經文由 LSM Text Only Holy Bible Recovery Version API 即時提供，"
            "請依官方授權規範使用。"
        ),
        alias="DEFAULT_RECOVERY_ATTRIBUTION",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_provider_config(self):
        if self.recovery_provider == "web_fallback" and not self.recovery_web_fetch_enabled:
            raise ValueError("RECOVERY_PROVIDER=web_fallback 時需設 RECOVERY_WEB_FETCH_ENABLED=true")
        if self.recovery_retry_attempts < 1:
            raise ValueError("RECOVERY_RETRY_ATTEMPTS must be >= 1")
        if self.action_auth_enabled and self.action_auth_mode == "bearer" and not self.action_api_key:
            raise ValueError("ACTION_API_KEY is required when ACTION_AUTH_ENABLED=true and ACTION_AUTH_MODE=bearer")

        if self.recovery_api_auth_mode == "header" and not self.recovery_api_auth_header_name.strip():
            raise ValueError("RECOVERY_API_AUTH_HEADER_NAME is required when RECOVERY_API_AUTH_MODE=header")

        if self.recovery_api_auth_mode == "query" and not self.recovery_api_auth_query_param.strip():
            raise ValueError("RECOVERY_API_AUTH_QUERY_PARAM is required when RECOVERY_API_AUTH_MODE=query")
        if (
            self.recovery_provider == "lsm_api"
            and self.recovery_api_auth_mode == "basic"
            and not self.recovery_api_app_id.strip()
        ):
            raise ValueError("RECOVERY_API_APP_ID is required when RECOVERY_API_AUTH_MODE=basic")
        if not self.recovery_api_ref_param.strip():
            raise ValueError("RECOVERY_API_REF_PARAM is required")
        if not self.recovery_api_output_param.strip():
            raise ValueError("RECOVERY_API_OUTPUT_PARAM is required")
        if self.recovery_api_input_mode.strip() and not self.recovery_api_input_param.strip():
            raise ValueError("RECOVERY_API_INPUT_PARAM is required when RECOVERY_API_INPUT_MODE is set")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
