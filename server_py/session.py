import secrets
from datetime import datetime, timedelta

from sqlalchemy import text, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session_factory
from models import AppSession

COOKIE_NAME = "session_id"
MAX_AGE_DAYS = 30


async def create_session_table():
    """Create the app_sessions table if it doesn't exist."""
    from database import engine

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_sessions (
                sid TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TIMESTAMP NOT NULL
            )
        """))


async def create_session(db: AsyncSession, user_id: int) -> str:
    """Create a new session and return the session ID."""
    sid = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=MAX_AGE_DAYS)
    session_row = AppSession(sid=sid, user_id=user_id, expires_at=expires_at)
    db.add(session_row)
    await db.commit()
    return sid


async def get_session_user_id(db: AsyncSession, sid: str) -> int | None:
    """Look up a session and return the user_id, or None if expired/missing."""
    result = await db.execute(select(AppSession).where(AppSession.sid == sid))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if row.expires_at < datetime.utcnow():
        await db.execute(delete(AppSession).where(AppSession.sid == sid))
        await db.commit()
        return None
    return row.user_id


async def delete_session(db: AsyncSession, sid: str):
    """Delete a session."""
    await db.execute(delete(AppSession).where(AppSession.sid == sid))
    await db.commit()
