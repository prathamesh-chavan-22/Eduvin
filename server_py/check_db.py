import asyncio
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Enrollment
import os
from config import ASYNC_DATABASE_URL

async def check():
    engine = create_async_engine(ASYNC_DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get enrollment 7
        result = await session.execute(select(Enrollment).where(Enrollment.id == 7))
        e = result.scalar_one_or_none()
        if e:
            print(f"Enrollment 7: UserID: {e.user_id}, CourseID: {e.course_id}")
        else:
            print("Enrollment 7 not found")

if __name__ == "__main__":
    asyncio.run(check())
