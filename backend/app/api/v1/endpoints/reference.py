from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_reference_service
from app.services.reference_service import ReferenceService
from app.utils.response import ok

router = APIRouter()


@router.get("/product-groups")
async def get_product_groups(
    service: ReferenceService = Depends(get_reference_service),
) -> dict:
    data = await service.product_groups()
    return ok(data.model_dump())


@router.get("/products")
async def get_products(
    group_code: str | None = Query(None),
    q: str | None = Query(None, description="Search prod_name / prod_code"),
    service: ReferenceService = Depends(get_reference_service),
) -> dict:
    data = await service.products(group_code, q)
    return ok(data.model_dump())


@router.get("/currencies")
async def get_currencies(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.currencies()])


@router.get("/units")
async def get_units(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.units()])


@router.get("/price-sources")
async def get_price_sources(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.price_sources()])


@router.get("/forecast-providers")
async def get_forecast_providers(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.forecast_providers()])


@router.get("/regions")
async def get_regions(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.regions()])


@router.get("/indicators")
async def get_indicators(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.indicators()])


@router.get("/indicator-data")
async def get_indicator_data(
    service: ReferenceService = Depends(get_reference_service),
    indicator_code: str | None = Query(None),
    region_code: str | None = Query(None),
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None),
) -> dict:
    rows = await service.indicator_data_rows(indicator_code, region_code)
    if from_ is not None or to is not None:
        filtered: list[dict] = []
        for row in rows:
            pd = row.period
            if not pd:
                continue
            try:
                pd_d = date.fromisoformat(pd[:10])
            except ValueError:
                filtered.append(row.model_dump())
                continue
            if from_ is not None and pd_d < from_:
                continue
            if to is not None and pd_d > to:
                continue
            filtered.append(row.model_dump())
        return ok(filtered)
    return ok([r.model_dump() for r in rows])


@router.get("/stock-indices")
async def get_stock_indices(service: ReferenceService = Depends(get_reference_service)) -> dict:
    return ok([x.model_dump() for x in await service.stock_indices()])


@router.get("/stock-index-prices")
async def get_stock_index_prices(
    service: ReferenceService = Depends(get_reference_service),
    code: str = Query(..., description="stock_index_master.code"),
    from_: date | None = Query(None, alias="from"),
    to: date | None = Query(None),
) -> dict:
    if not code.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="code required")
    rows = await service.stock_index_prices(code.strip(), from_, to)
    return ok([x.model_dump() for x in rows])
