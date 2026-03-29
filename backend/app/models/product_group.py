from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductGroup(Base):
    __tablename__ = "product_group"

    group_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    group_name: Mapped[str] = mapped_column(String(255), nullable=False)

    products: Mapped[list["Product"]] = relationship(back_populates="group")
