import asyncio
from database import async_session_factory
from models import User
from sqlalchemy import select

async def main():
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.full_name.ilike('%Jane%')))
        user = result.scalar_one_or_none()
        if user:
            print(f"User: {user.full_name}")
            if user.face_embedding:
                print(f"Embedding length: {len(user.face_embedding)}")
            else:
                print("Face embedding is NULL")
        else:
            print("Jane not found")

        # Get all users with embeddings
        result = await session.execute(select(User).where(User.face_embedding.is_not(None)))
        users = result.scalars().all()
        print("\nUsers with embeddings:")
        for u in users:
            print(f"- {u.full_name} (Length: {len(u.face_embedding)})")

if __name__ == "__main__":
    asyncio.run(main())
