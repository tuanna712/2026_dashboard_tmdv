from collections.abc import Sequence
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import Select, and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.price_history import PriceHistory
from app.models.price_latest import PriceLatest
from app.models.product import Product
from app.models.product_group import ProductGroup


class DashboardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._settings = get_settings()

    async def fetch_pricing_rows(
        self,
        group_codes: Sequence[str],
    ) -> list[tuple[PriceLatest, str, str, str, str]]:
        """Returns rows: (price_latest, prod_name, group_code, group_name, currency_name optional)."""
        stmt: Select = (
            select(
                PriceLatest,
                Product.prod_name,
                Product.group_code,
                ProductGroup.group_name,
            )
            .join(Product, Product.prod_code == PriceLatest.prod_code)
            .join(ProductGroup, ProductGroup.group_code == Product.group_code)
            .where(Product.group_code.in_(list(group_codes)))
            .order_by(Product.group_code, Product.prod_code)
        )
        result = await self._session.execute(stmt)
        return list(result.all())

    async def list_products_in_group(self, group_code: str) -> list[Product]:
        r = await self._session.execute(
            select(Product)
            .where(Product.group_code == group_code)
            .order_by(Product.prod_code)
        )
        return list(r.scalars().all())

    async def get_products_by_codes(self, codes: Sequence[str]) -> list[Product]:
        if not codes:
            return []
        r = await self._session.execute(
            select(Product).where(Product.prod_code.in_(list(codes))).order_by(Product.prod_code)
        )
        return list(r.scalars().all())

    async def fetch_history_rows(
        self,
        prod_codes: Sequence[str],
        source: str,
        date_from: date,
        date_to: date,
    ) -> list[tuple[str, date, Decimal | None, str | None]]:
        stmt = (
            select(
                PriceHistory.prod_code,
                PriceHistory.price_date,
                PriceHistory.price,
                PriceHistory.unit,
            )
            .where(
                and_(
                    PriceHistory.prod_code.in_(list(prod_codes)),
                    PriceHistory.source == source,
                    PriceHistory.price_date >= date_from,
                    PriceHistory.price_date <= date_to,
                )
            )
            .order_by(PriceHistory.price_date, PriceHistory.prod_code)
        )
        r = await self._session.execute(stmt)
        out: list[tuple[str, date, Decimal | None, str | None]] = []
        for row in r.all():
            d = row[1]
            if d is None:
                continue
            out.append((row[0], d, row[2], row[3]))
        return out

    async def fetch_forecasts_latest_per_product(
        self,
        limit: int,
        group_code: str | None,
        period_type: str | None,
        forecast_provider: str | None,
    ) -> list[dict[str, object]]:
        """
        Latest row per prod_code using PostgreSQL DISTINCT ON.
        If your table uses column `source` instead of `forecast_provider`, update this SQL.
        """
        cond_parts = ["1=1"]
        params: dict[str, object] = {"lim": limit}
        if group_code:
            cond_parts.append("p.group_code = :g")
            params["g"] = group_code
        if period_type:
            cond_parts.append("f.period_type = :pt")
            params["pt"] = period_type
        if forecast_provider:
            cond_parts.append("f.forecast_provider = :fp")
            params["fp"] = forecast_provider
        where_sql = " AND ".join(cond_parts)
        sql = text(
            f"""
            SELECT DISTINCT ON (f.prod_code)
                f.id, f.prod_code, f.forecast_price, f.currency, f.unit,
                f.forecast_period, f.forecast_provider, f.period_type, f.created_at,
                p.prod_name,
                fp.forecast_provider_name
            FROM price_forecast f
            JOIN product p ON p.prod_code = f.prod_code
            LEFT JOIN forecast_provider fp
                ON fp.forecast_provider_code = f.forecast_provider
            WHERE {where_sql}
            ORDER BY f.prod_code, f.forecast_period DESC NULLS LAST, f.id DESC
            LIMIT :lim
            """
        )
        r = await self._session.execute(sql, params)
        return [dict(m) for m in r.mappings().all()]

    def default_date_range(self) -> tuple[date, date]:
        to_d = date.today()
        from_d = to_d - timedelta(days=self._settings.default_history_days)
        return from_d, to_d
