from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Newsletter Dashboard API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    database_url: str = Field(
        ...,
        description="Async SQLAlchemy URL, e.g. postgresql+asyncpg://user:pass@host:5432/db",
    )
    database_url_sync: str = Field(
        ...,
        description="Sync URL for Alembic, e.g. postgresql://user:pass@host:5432/db",
    )

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        description="Comma-separated origins",
    )

    default_history_days: int = 90
    default_forecast_limit: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()


def parse_cors_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]
