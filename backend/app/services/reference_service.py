from datetime import date
from decimal import Decimal

from app.repositories.reference_repository import ReferenceRepository
from app.schemas.dashboard import IndicatorDataRow, StockIndexItem, StockIndexPriceRow
from app.schemas.reference import (
    CurrencyItem,
    ForecastProviderItem,
    IndicatorItem,
    PriceSourceItem,
    ProductGroupItem,
    ProductGroupListData,
    ProductItem,
    ProductListData,
    RegionItem,
    UnitItem,
)


class ReferenceService:
    def __init__(self, repo: ReferenceRepository) -> None:
        self._repo = repo

    async def product_groups(self) -> ProductGroupListData:
        rows = await self._repo.list_product_groups()
        return ProductGroupListData(
            items=[ProductGroupItem(group_code=r.group_code, group_name=r.group_name) for r in rows]
        )

    async def products(self, group_code: str | None, q: str | None) -> ProductListData:
        tuples = await self._repo.list_products(group_code, q)
        items = [
            ProductItem(
                prod_id=p.prod_id,
                prod_code=p.prod_code,
                prod_name=p.prod_name,
                group_code=p.group_code,
                group_name=gn,
            )
            for p, gn in tuples
        ]
        return ProductListData(items=items)

    async def currencies(self) -> list[CurrencyItem]:
        return [
            CurrencyItem(currency_code=c.currency_code, name=c.name)
            for c in await self._repo.list_currencies()
        ]

    async def units(self) -> list[UnitItem]:
        return [UnitItem(unit_code=u.unit_code, name=u.name) for u in await self._repo.list_units()]

    async def price_sources(self) -> list[PriceSourceItem]:
        return [
            PriceSourceItem(source_code=s.source_code, name=s.name)
            for s in await self._repo.list_price_sources()
        ]

    async def forecast_providers(self) -> list[ForecastProviderItem]:
        return [
            ForecastProviderItem(
                forecast_provider_code=f.forecast_provider_code,
                forecast_provider_name=f.forecast_provider_name,
            )
            for f in await self._repo.list_forecast_providers()
        ]

    async def regions(self) -> list[RegionItem]:
        return [
            RegionItem(region_code=r.region_code, region_name=r.region_name)
            for r in await self._repo.list_regions()
        ]

    async def indicators(self) -> list[IndicatorItem]:
        return [
            IndicatorItem(
                indicator_code=i.indicator_code,
                name=i.name,
                category=i.category,
            )
            for i in await self._repo.list_indicators()
        ]

    async def indicator_data_rows(
        self,
        indicator_code: str | None,
        region_code: str | None,
    ) -> list[IndicatorDataRow]:
        rows = await self._repo.list_indicator_data(indicator_code, region_code)
        out: list[IndicatorDataRow] = []
        for row in rows:
            v = row.value
            out.append(
                IndicatorDataRow(
                    id=row.id,
                    indicator_code=row.indicator_code,
                    region_code=row.region_code,
                    value=str(v) if isinstance(v, Decimal) else (str(v) if v is not None else None),
                    unit=row.unit,
                    period=row.period,
                    period_type=row.period_type,
                )
            )
        return out

    async def stock_indices(self) -> list[StockIndexItem]:
        return [
            StockIndexItem(code=m.code, name=m.name, market=m.market)
            for m in await self._repo.list_stock_masters()
        ]

    async def stock_index_prices(
        self,
        code: str,
        date_from: date | None,
        date_to: date | None,
    ) -> list[StockIndexPriceRow]:
        rows = await self._repo.list_stock_prices(code, date_from, date_to)
        result: list[StockIndexPriceRow] = []
        for r in rows:
            c = r.close
            result.append(
                StockIndexPriceRow(
                    id=r.id,
                    code=r.code,
                    date=r.date,
                    close=str(c) if isinstance(c, Decimal) else (str(c) if c is not None else None),
                    currency=r.currency,
                )
            )
        return result
