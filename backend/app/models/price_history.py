from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prod_code: Mapped[str] = mapped_column(String(50), ForeignKey("product.prod_code"))
    price: Mapped[Decimal | None] = mapped_column(Numeric(18, 4))
    currency: Mapped[str | None] = mapped_column(String(50), ForeignKey("currency.currency_code"))
    unit: Mapped[str | None] = mapped_column(String(50), ForeignKey("unit.unit_code"))
    # DB column is `date` per data/create_tables.py DDL; attribute name stays price_date for callers.
    price_date: Mapped[date | None] = mapped_column("date", Date)
    source: Mapped[str | None] = mapped_column(String(50), ForeignKey("price_source.source_code"))
