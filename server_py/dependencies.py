from typing import Optional

from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from session import get_session_user_id, COOKIE_NAME


async def get_current_user_id(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[int]:
    sid = request.cookies.get(COOKIE_NAME)
    if not sid:
        return None
    return await get_session_user_id(db, sid)


async def require_auth(user_id: Optional[int] = Depends(get_current_user_id)) -> int:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


async def require_auth_with_role(
    user_id: Optional[int] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> tuple[int, str]:
    """Returns (user_id, role). Raises 401 if not authenticated."""
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from storage import get_user
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user_id, user.role
