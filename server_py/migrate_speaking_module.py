"""
Migration script to add all speaking module tables and columns.
Run this once to update the database schema.
"""

import asyncio
from sqlalchemy import text
from database import engine


async def migrate_database():
    print("Starting migration...")
    
    # Add preferred_language column to users table
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(2) DEFAULT 'en' NOT NULL
            """))
        print("✓ Added preferred_language column to users table")
    except Exception as e:
        print(f"⚠ Error adding preferred_language: {e}")
    
    # Create speaking_topics table
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS speaking_topics (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    icon VARCHAR(10),
                    order_index INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
        print("✓ Created speaking_topics table")
    except Exception as e:
        print(f"⚠ Error creating speaking_topics: {e}")
    
    # Create speaking_lessons table
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS speaking_lessons (
                    id SERIAL PRIMARY KEY,
                    topic_id INTEGER NOT NULL REFERENCES speaking_topics(id) ON DELETE CASCADE,
                    difficulty_level INTEGER NOT NULL,
                    prompt_en TEXT NOT NULL,
                    prompt_hi TEXT,
                    prompt_mr TEXT,
                    target_vocabulary TEXT,
                    order_index INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
        print("✓ Created speaking_lessons table")
    except Exception as e:
        print(f"⚠ Error creating speaking_lessons: {e}")
    
    # Create user_lesson_progress table
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_lesson_progress (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    lesson_id INTEGER NOT NULL REFERENCES speaking_lessons(id) ON DELETE CASCADE,
                    attempts INTEGER DEFAULT 0,
                    best_score FLOAT DEFAULT 0.0,
                    completed BOOLEAN DEFAULT FALSE,
                    last_practiced_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, lesson_id)
                )
            """))
        print("✓ Created user_lesson_progress table")
    except Exception as e:
        print(f"⚠ Error creating user_lesson_progress: {e}")
    
    # Check if speaking_practices table exists and add columns if needed
    # Note: The columns are already defined in the model, so this is just for existing tables
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'speaking_practices' AND column_name = 'vocabulary_score'
            """))
            if not result.fetchone():
                await conn.execute(text("""
                    ALTER TABLE speaking_practices 
                    ADD COLUMN vocabulary_score FLOAT DEFAULT 0.0
                """))
                print("✓ Added vocabulary_score column to speaking_practices")
            else:
                print("⊙ vocabulary_score column already exists in speaking_practices")
    except Exception as e:
        print(f"⊙ speaking_practices table will be created by Base.metadata.create_all()")
    
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'speaking_practices' AND column_name = 'grammar_score'
            """))
            if not result.fetchone():
                await conn.execute(text("""
                    ALTER TABLE speaking_practices 
                    ADD COLUMN grammar_score FLOAT DEFAULT 0.0
                """))
                print("✓ Added grammar_score column to speaking_practices")
            else:
                print("⊙ grammar_score column already exists in speaking_practices")
    except Exception as e:
        print(f"⊙ speaking_practices table will be created by Base.metadata.create_all()")
    
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'speaking_practices' AND column_name = 'lesson_id'
            """))
            if not result.fetchone():
                await conn.execute(text("""
                    ALTER TABLE speaking_practices 
                    ADD COLUMN lesson_id INTEGER REFERENCES speaking_lessons(id) ON DELETE SET NULL
                """))
                print("✓ Added lesson_id column to speaking_practices")
            else:
                print("⊙ lesson_id column already exists in speaking_practices")
    except Exception as e:
        print(f"⊙ speaking_practices table will be created by Base.metadata.create_all()")
    
    # Create indexes for better query performance
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_speaking_lessons_topic_id 
                ON speaking_lessons(topic_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id 
                ON user_lesson_progress(user_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id 
                ON user_lesson_progress(lesson_id)
            """))
        print("✓ Created indexes")
    except Exception as e:
        print(f"⚠ Error creating indexes: {e}")
    
    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate_database())
