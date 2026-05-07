import asyncio
from database import async_session_factory
from sqlalchemy import select, func
from models import SpeakingTopic, SpeakingLesson


async def check_seeds():
    async with async_session_factory() as db:
        topic_count = await db.scalar(select(func.count()).select_from(SpeakingTopic))
        lesson_count = await db.scalar(select(func.count()).select_from(SpeakingLesson))
        
        print(f"✅ Database seed verification:")
        print(f"   Topics: {topic_count}")
        print(f"   Lessons: {lesson_count}")
        
        if topic_count > 0 and lesson_count > 0:
            print(f"\n🎉 Successfully seeded the database!")
        else:
            print(f"\n⚠️ No data was seeded.")


if __name__ == "__main__":
    asyncio.run(check_seeds())
