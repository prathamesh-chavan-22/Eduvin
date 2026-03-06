from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth
from schemas import NotificationOut, ErrorResponse
import storage

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user_id: int = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    notifications = await storage.get_notifications(db, user_id)
    return [NotificationOut.model_validate(n).model_dump(by_alias=True) for n in notifications]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: int, user_id: int = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    notification = await storage.mark_notification_read(db, notification_id)
    if notification is None:
        return Response(
            content=ErrorResponse(message="Notification not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )
    return NotificationOut.model_validate(notification).model_dump(by_alias=True)
