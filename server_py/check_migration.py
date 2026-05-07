import asyncio
from sqlalchemy import text
from database import engine


async def check_column():
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'preferred_language'
        """))
        column = result.fetchone()
        if column:
            print("✓ preferred_language column exists in users table")
            return True
        else:
            print("✗ preferred_language column does NOT exist in users table")
            return False


if __name__ == "__main__":
    exists = asyncio.run(check_column())
    if not exists:
        print("\nPlease run: python migrate_speaking_module.py")
