from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ForecastProvider(Base):
    __tablename__ = "forecast_provider"

    forecast_provider_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    forecast_provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
