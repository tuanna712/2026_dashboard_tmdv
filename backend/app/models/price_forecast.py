from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceForecast(Base):
    __tablename__ = "price_forecast"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prod_code: Mapped[str] = mapped_column(String(50), ForeignKey("product.prod_code"))
    forecast_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    currency: Mapped[str | None] = mapped_column(String(50), ForeignKey("currency.currency_code"))
    unit: Mapped[str | None] = mapped_column(String(50), ForeignKey("unit.unit_code"))
    forecast_period: Mapped[str | None] = mapped_column(String(50))
    # CSV / seed uses `forecast_provider`; diagram may call this `source`
    forecast_provider: Mapped[str | None] = mapped_column(
        "forecast_provider",
        String(50),
        ForeignKey("forecast_provider.forecast_provider_code"),
        nullable=True,
    )
    period_type: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[date | None] = mapped_column(Date)
