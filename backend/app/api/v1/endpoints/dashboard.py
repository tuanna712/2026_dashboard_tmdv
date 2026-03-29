from datetime import date

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_dashboard_service
from app.services.dashboard_service import DashboardService
from app.utils.response import ok

router = APIRouter(prefix="/dashboard")


@router.get("/pricing-by-group")
async def pricing_by_group(
    service: DashboardService = Depends(get_dashboard_service),
    groups: str | None = Query(
        None,
        description="Comma-separated group_code values, default CRUDE,FUEL,FERT,AGRI",
    ),
    market: str | None = Query(
        None,
        description="international | domestic — Phase 1: echoed only; price_latest is not split by market.",
    ),
) -> dict:
    data = await service.pricing_by_group(groups, market)
    return ok(data.model_dump(mode="json"))


@router.get("/price-history-chart")
async def price_history_chart(
    service: DashboardService = Depends(get_dashboard_service),
    group_code: str | None = Query(None, description="CRUDE | FUEL | FERT | AGRI"),
    prod_codes: str | None = Query(None, description="Comma-separated override"),
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None),
    source: str | None = Query(None, description="Overrides market-derived source (e.g. DOM, INTL)"),
    market: str | None = Query(None, description="Maps to source when `source` omitted"),
    granularity: str | None = Query("day", description="day | week | month"),
) -> dict:
    data = await service.price_history_chart(
        group_code,
        prod_codes,
        from_,
        to,
        source,
        market,
        granularity,
    )
    return ok(data.model_dump(mode="json"))


@router.get("/price-forecasts")
async def price_forecasts(
    service: DashboardService = Depends(get_dashboard_service),
    limit: int | None = Query(None, ge=1, le=500),
    group_code: str | None = Query(None),
    period_type: str | None = Query(None),
    forecast_provider: str | None = Query(None),
) -> dict:
    data = await service.price_forecasts(limit, group_code, period_type, forecast_provider)
    return ok(data.model_dump(mode="json"))
