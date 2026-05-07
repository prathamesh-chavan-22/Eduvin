import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from models import Base
from config import ASYNC_DATABASE_URL

async def migrate_db():
    print(f"Connecting to {ASYNC_DATABASE_URL}...")
    engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
    
    # 1. Create any new tables (like Attendance)
    print("Creating new tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # 2. Add face_embedding column to users table if it doesn't exist
    print("Adding face_embedding column to users table...")
    async with engine.begin() as conn:
        try:
            # We use a raw SQL query to add the column. 
            if "sqlite" in ASYNC_DATABASE_URL:
                await conn.execute(text("ALTER TABLE users ADD COLUMN face_embedding JSON;"))
            else:
                # PostgreSQL
                await conn.execute(text("ALTER TABLE users ADD COLUMN face_embedding JSON;"))
            print("Successfully added face_embedding column.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "duplicate" in str(e).lower():
                print("Column 'face_embedding' already exists.")
            else:
                print(f"Notice during migration (might already exist): {e}")

    await engine.dispose()
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_db())
