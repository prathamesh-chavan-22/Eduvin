import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from database import async_session_factory
import storage

async def main():
    async with async_session_factory() as db:
        users = await storage.get_users(db)
        print("--- USERS IN DB ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")
        print(f"Total Users: {len(users)}")

if __name__ == "__main__":
    asyncio.run(main())
