from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import (
    ForecastListData,
    ForecastRow,
    HistoryChartData,
    HistorySeries,
    PricingByGroupData,
    PricingGroupBlock,
    PricingRow,
)
from app.utils.change_direction import normalize_change_direction
from app.utils.market import default_source_for_market, resolve_history_source


def _as_date(v: object | None) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return None


def _dec_str(v: Decimal | None, *, default: str = "0") -> str:
    if v is None:
        return default
    return format(v, "f")


def _bucket_date(d: date, granularity: str) -> date:
    g = (granularity or "day").lower()
    if g == "week":
        return d - timedelta(days=d.weekday())
    if g == "month":
        return date(d.year, d.month, 1)
    return d


class DashboardService:
    def __init__(self, repo: DashboardRepository) -> None:
        self._repo = repo
        self._settings = get_settings()

    async def pricing_by_group(
        self,
        groups_csv: str | None,
        market: str | None,
    ) -> PricingByGroupData:
        default_groups = ["CRUDE", "FUEL", "FERT", "AGRI"]
        if groups_csv and groups_csv.strip():
            group_codes = [g.strip().upper() for g in groups_csv.split(",") if g.strip()]
        else:
            group_codes = default_groups

        rows = await self._repo.fetch_pricing_rows(group_codes)
        by_group: dict[str, list[PricingRow]] = defaultdict(list)
        group_names: dict[str, str] = {}

        for pl, prod_name, gc, gn in rows:
            if gc is None:
                continue
            group_names[gc] = gn
            by_group[gc].append(
                PricingRow(
                    prod_code=pl.prod_code,
                    prod_name=prod_name,
                    price=_dec_str(pl.price),
                    currency_code=pl.currency_code,
                    unit_code=None,
                    last_updated_at=pl.last_updated_at,
                    value_change=_dec_str(pl.value_change) if pl.value_change is not None else None,
                    percentage_change=_dec_str(pl.percentage_change)
                    if pl.percentage_change is not None
                    else None,
                    change_direction=normalize_change_direction(pl.change_direction),
                )
            )

        mkt = (market or "international").lower() if market else "international"
        blocks: list[PricingGroupBlock] = []
        for gc in group_codes:
            blocks.append(
                PricingGroupBlock(
                    group_code=gc,
                    group_name=group_names.get(gc, gc),
                    items=by_group.get(gc, []),
                )
            )
        return PricingByGroupData(market=mkt, groups=blocks)

    async def price_history_chart(
        self,
        group_code: str | None,
        prod_codes_csv: str | None,
        date_from: date | None,
        date_to: date | None,
        source: str | None,
        market: str | None,
        granularity: str | None,
    ) -> HistoryChartData:
        if not group_code and not prod_codes_csv:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Either group_code or prod_codes is required",
            )
        gc = group_code.strip().upper() if group_code else None
        products_in_group = await self._repo.list_products_in_group(gc) if gc else []

        if prod_codes_csv and prod_codes_csv.strip():
            codes = [c.strip().upper() for c in prod_codes_csv.split(",") if c.strip()]
            allowed = {p.prod_code for p in products_in_group} if gc else None
            if allowed is not None:
                bad = [c for c in codes if c not in allowed]
                if bad:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"prod_codes not in group {gc}: {bad}",
                    )
            prod_codes = codes
        else:
            if not gc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="group_code is required when prod_codes is omitted",
                )
            prod_codes = [p.prod_code for p in products_in_group]

        if not prod_codes:
            return HistoryChartData(
                group_code=gc or "",
                source=resolve_history_source(market, source) or default_source_for_market(market),
                dates=[],
                series=[],
            )

        code_to_label: dict[str, str]
        if gc:
            code_to_label = {p.prod_code: p.prod_name for p in products_in_group}
        else:
            loaded = await self._repo.get_products_by_codes(prod_codes)
            found = {p.prod_code for p in loaded}
            missing = [c for c in prod_codes if c not in found]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unknown prod_codes: {missing}",
                )
            code_to_label = {p.prod_code: p.prod_name for p in loaded}

        eff_source = resolve_history_source(market, source) or default_source_for_market(market)
        df, dt = date_from, date_to
        if df is None or dt is None:
            df, dt = self._repo.default_date_range()
        if df > dt:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="from must be <= to",
            )

        raw = await self._repo.fetch_history_rows(prod_codes, eff_source, df, dt)
        g = (granularity or "day").lower()
        bucketed: dict[tuple[str, date], tuple[date, Decimal | None]] = {}
        for prod_code, pdate, price, _unit in raw:
            b = _bucket_date(pdate, g)
            key = (prod_code, b)
            if key not in bucketed or pdate > bucketed[key][0]:
                bucketed[key] = (pdate, price)

        all_buckets = sorted({b for (_pc, b) in bucketed.keys()})
        # Only series that actually have rows for this source (INTL vs DOM differ by product).
        series_codes = sorted({row[0] for row in raw})
        for pc in series_codes:
            code_to_label.setdefault(pc, pc)

        series_list: list[HistorySeries] = []
        for pc in series_codes:
            prices: list[float | None] = []
            unit_code: str | None = None
            for b in all_buckets:
                _mx, pr = bucketed.get((pc, b), (date.min, None))
                if pr is not None:
                    prices.append(float(pr))
                else:
                    prices.append(None)
            series_list.append(
                HistorySeries(
                    prod_code=pc,
                    label=code_to_label.get(pc, pc),
                    prices=prices,
                    unit_code=unit_code,
                )
            )

        return HistoryChartData(
            group_code=gc or "",
            source=eff_source,
            dates=all_buckets,
            series=series_list,
        )

    async def price_forecasts(
        self,
        limit: int | None,
        group_code: str | None,
        period_type: str | None,
        forecast_provider: str | None,
    ) -> ForecastListData:
        lim = limit if limit is not None else self._settings.default_forecast_limit
        rows = await self._repo.fetch_forecasts_latest_per_product(
            lim,
            group_code.strip().upper() if group_code else None,
            period_type.strip().upper() if period_type else None,
            forecast_provider.strip().upper() if forecast_provider else None,
        )
        items: list[ForecastRow] = []
        for m in rows:
            fp = m.get("forecast_price")
            items.append(
                ForecastRow(
                    id=int(m["id"]),
                    prod_code=str(m["prod_code"]),
                    prod_name=str(m["prod_name"]),
                    forecast_price=_dec_str(fp) if isinstance(fp, Decimal) else str(fp or "0"),
                    currency_code=str(m["currency"]) if m.get("currency") else None,
                    unit_code=str(m["unit"]) if m.get("unit") else None,
                    forecast_period=str(m["forecast_period"]) if m.get("forecast_period") else None,
                    period_type=str(m["period_type"]) if m.get("period_type") else None,
                    forecast_provider_code=str(m["forecast_provider"])
                    if m.get("forecast_provider")
                    else None,
                    forecast_provider_name=str(m["forecast_provider_name"])
                    if m.get("forecast_provider_name")
                    else None,
                    created_at=_as_date(m.get("created_at")),
                )
            )
        return ForecastListData(items=items)
