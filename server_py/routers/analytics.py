from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth
import storage

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard(
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate analytics: completion rate, quiz scores, at-risk learners, trend."""
    data = await storage.get_analytics_dashboard(db)
    return data
