from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth
from schemas import UserOut, UpdateUserLanguage
import storage

router = APIRouter(prefix="/api", tags=["users"])


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    users = await storage.get_users(db)
    return [UserOut.model_validate(u).model_dump(by_alias=True) for u in users]


@router.patch("/user/language")
async def update_language_preference(
    body: UpdateUserLanguage,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Update user's preferred language for speaking lessons."""
    user = await storage.update_user_language(db, user_id, body.preferred_language)
    if not user:
        return {"error": "User not found"}, 404
    return UserOut.model_validate(user).model_dump(by_alias=True)
