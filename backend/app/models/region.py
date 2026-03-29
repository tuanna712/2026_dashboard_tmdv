from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Region(Base):
    __tablename__ = "region"

    region_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    region_name: Mapped[str] = mapped_column(String(255), nullable=False)
