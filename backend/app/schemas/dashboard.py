from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class PricingRow(BaseModel):
    prod_code: str
    prod_name: str
    price: str
    currency_code: str | None
    unit_code: str | None = None
    last_updated_at: datetime | None
    value_change: str | None
    percentage_change: str | None
    change_direction: Literal["up", "down", "flat"]


class PricingGroupBlock(BaseModel):
    group_code: str
    group_name: str
    items: list[PricingRow]


class PricingByGroupData(BaseModel):
    market: str
    groups: list[PricingGroupBlock]


class HistorySeries(BaseModel):
    prod_code: str
    label: str
    prices: list[float | None]
    unit_code: str | None = None


class HistoryChartData(BaseModel):
    group_code: str
    source: str
    dates: list[date]
    series: list[HistorySeries]


class ForecastRow(BaseModel):
    id: int
    prod_code: str
    prod_name: str
    forecast_price: str
    currency_code: str | None
    unit_code: str | None
    forecast_period: str | None
    period_type: str | None
    forecast_provider_code: str | None
    forecast_provider_name: str | None
    created_at: date | None = None


class ForecastListData(BaseModel):
    items: list[ForecastRow]


class IndicatorDataRow(BaseModel):
    id: int
    indicator_code: str
    region_code: str
    value: str | None
    unit: str | None
    period: str | None
    period_type: str | None


class StockIndexItem(BaseModel):
    code: str
    name: str
    market: str | None


class StockIndexPriceRow(BaseModel):
    id: int
    code: str
    date: date | None
    close: str | None
    currency: str | None
