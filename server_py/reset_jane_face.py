import asyncio
from database import async_session_factory
from models import User
from sqlalchemy import select


async def main():
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.full_name.ilike('%Jane%'))
        )
        user = result.scalar_one_or_none()

        if not user:
            print("Jane not found in database.")
            return

        print(f"Found: {user.full_name} (id={user.id})")
        if user.face_embedding:
            print(f"  Current embedding length: {len(user.face_embedding)}")
        else:
            print("  No embedding stored - nothing to clear.")
            return

        user.face_embedding = None
        await session.commit()
        print("DONE: Jane face embedding cleared.")
        print("  Next step: Go to Admin panel > Register Employee Face")
        print("  Select 'Live Webcam', capture Jane's face, click Save.")


if __name__ == "__main__":
    asyncio.run(main())
