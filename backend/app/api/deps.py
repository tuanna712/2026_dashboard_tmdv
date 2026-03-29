from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.reference_repository import ReferenceRepository
from app.services.dashboard_service import DashboardService
from app.services.reference_service import ReferenceService


def get_reference_service(
    db: AsyncSession = Depends(get_db),
) -> ReferenceService:
    return ReferenceService(ReferenceRepository(db))


def get_dashboard_service(
    db: AsyncSession = Depends(get_db),
) -> DashboardService:
    return DashboardService(DashboardRepository(db))
