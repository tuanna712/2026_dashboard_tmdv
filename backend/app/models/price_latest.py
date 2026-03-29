from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceLatest(Base):
    __tablename__ = "price_latest"

    prod_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("product.prod_code"), primary_key=True
    )
    price: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    currency_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    value_change: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    percentage_change: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    change_direction: Mapped[str | None] = mapped_column(String(20))
