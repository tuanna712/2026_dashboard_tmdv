from pydantic import BaseModel, Field


class ProductGroupItem(BaseModel):
    group_code: str
    group_name: str


class ProductGroupListData(BaseModel):
    items: list[ProductGroupItem]


class ProductItem(BaseModel):
    prod_id: int
    prod_code: str
    prod_name: str
    group_code: str | None
    group_name: str | None


class ProductListData(BaseModel):
    items: list[ProductItem]


class CurrencyItem(BaseModel):
    currency_code: str
    name: str


class UnitItem(BaseModel):
    unit_code: str
    name: str


class PriceSourceItem(BaseModel):
    source_code: str
    name: str


class ForecastProviderItem(BaseModel):
    forecast_provider_code: str
    forecast_provider_name: str


class RegionItem(BaseModel):
    region_code: str
    region_name: str


class IndicatorItem(BaseModel):
    indicator_code: str
    name: str
    category: str | None = None
