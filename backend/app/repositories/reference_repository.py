from datetime import date

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.currency import Currency
from app.models.forecast_provider import ForecastProvider
from app.models.indicator import Indicator, IndicatorData
from app.models.price_source import PriceSource
from app.models.product import Product
from app.models.product_group import ProductGroup
from app.models.region import Region
from app.models.stock import StockIndexMaster, StockIndexPrice
from app.models.unit import Unit


class ReferenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_product_groups(self) -> list[ProductGroup]:
        result = await self._session.execute(
            select(ProductGroup).order_by(ProductGroup.group_code)
        )
        return list(result.scalars().all())

    async def list_products(
        self,
        group_code: str | None,
        q: str | None,
    ) -> list[tuple[Product, str | None]]:
        stmt: Select = (
            select(Product, ProductGroup.group_name)
            .outerjoin(ProductGroup, ProductGroup.group_code == Product.group_code)
            .order_by(Product.group_code, Product.prod_code)
        )
        if group_code:
            stmt = stmt.where(Product.group_code == group_code)
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Product.prod_name).like(term),
                    func.lower(Product.prod_code).like(term),
                )
            )
        result = await self._session.execute(stmt)
        return list(result.all())

    async def list_currencies(self) -> list[Currency]:
        r = await self._session.execute(select(Currency).order_by(Currency.currency_code))
        return list(r.scalars().all())

    async def list_units(self) -> list[Unit]:
        r = await self._session.execute(select(Unit).order_by(Unit.unit_code))
        return list(r.scalars().all())

    async def list_price_sources(self) -> list[PriceSource]:
        r = await self._session.execute(select(PriceSource).order_by(PriceSource.source_code))
        return list(r.scalars().all())

    async def list_forecast_providers(self) -> list[ForecastProvider]:
        r = await self._session.execute(
            select(ForecastProvider).order_by(ForecastProvider.forecast_provider_code)
        )
        return list(r.scalars().all())

    async def list_regions(self) -> list[Region]:
        r = await self._session.execute(select(Region).order_by(Region.region_code))
        return list(r.scalars().all())

    async def list_indicators(self) -> list[Indicator]:
        r = await self._session.execute(select(Indicator).order_by(Indicator.indicator_code))
        return list(r.scalars().all())

    async def list_indicator_data(
        self,
        indicator_code: str | None,
        region_code: str | None,
        limit: int = 5000,
    ) -> list[IndicatorData]:
        stmt = select(IndicatorData)
        conds = []
        if indicator_code:
            conds.append(IndicatorData.indicator_code == indicator_code)
        if region_code:
            conds.append(IndicatorData.region_code == region_code)
        if conds:
            stmt = stmt.where(and_(*conds))
        stmt = stmt.order_by(IndicatorData.id).limit(limit)
        r = await self._session.execute(stmt)
        return list(r.scalars().all())

    async def list_stock_masters(self) -> list[StockIndexMaster]:
        r = await self._session.execute(
            select(StockIndexMaster).order_by(StockIndexMaster.code)
        )
        return list(r.scalars().all())

    async def list_stock_prices(
        self,
        code: str,
        date_from: date | None,
        date_to: date | None,
    ) -> list[StockIndexPrice]:
        stmt = select(StockIndexPrice).where(StockIndexPrice.code == code)
        if date_from is not None:
            stmt = stmt.where(StockIndexPrice.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(StockIndexPrice.date <= date_to)
        stmt = stmt.order_by(StockIndexPrice.date)
        r = await self._session.execute(stmt)
        return list(r.scalars().all())
