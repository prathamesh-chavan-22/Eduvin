"""
Migration script to add unique constraint on enrollments table
to prevent duplicate enrollments for the same user and course.
"""
import asyncio
from sqlalchemy import text
from database import async_session_factory


async def add_unique_constraint():
    """Add unique constraint to enrollments table."""
    async with async_session_factory() as db:
        try:
            # First check if constraint already exists
            check_sql = """
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'enrollments' 
            AND constraint_name = 'uix_user_course';
            """
            result = await db.execute(text(check_sql))
            existing = result.fetchone()
            
            if existing:
                print("✅ Constraint 'uix_user_course' already exists.")
                return
            
            # Add the unique constraint
            alter_sql = """
            ALTER TABLE enrollments 
            ADD CONSTRAINT uix_user_course UNIQUE (user_id, course_id);
            """
            await db.execute(text(alter_sql))
            await db.commit()
            print("✅ Successfully added unique constraint 'uix_user_course' to enrollments table.")
            
        except Exception as e:
            print(f"❌ Error adding constraint: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(add_unique_constraint())
