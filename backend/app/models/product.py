from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Product(Base):
    __tablename__ = "product"

    # Live DB uses surrogate PK column `id` (see data/create_tables.py); CSV/diagram call it prod_id in docs.
    prod_id: Mapped[int] = mapped_column("id", Integer, primary_key=True, autoincrement=True)
    prod_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    prod_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group_code: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("product_group.group_code"), nullable=True
    )

    group: Mapped["ProductGroup | None"] = relationship(back_populates="products")
