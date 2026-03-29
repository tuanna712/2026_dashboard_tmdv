from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Indicator(Base):
    __tablename__ = "indicator"

    indicator_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))


class IndicatorData(Base):
    __tablename__ = "indicator_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    indicator_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("indicator.indicator_code")
    )
    region_code: Mapped[str] = mapped_column(String(50), ForeignKey("region.region_code"))
    value: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    unit: Mapped[str | None] = mapped_column(String(50))
    period: Mapped[str | None] = mapped_column(String(50))
    period_type: Mapped[str | None] = mapped_column(String(50))
