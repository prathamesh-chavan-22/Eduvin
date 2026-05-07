from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import ASYNC_DATABASE_URL

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_size=20,           # Increase from default 5 for concurrent load
    max_overflow=30,        # Increase from default 10 for peak handling
    pool_pre_ping=True,     # Detect stale connections
    pool_recycle=3600,      # Recycle connections after 1 hour
)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session_factory() as session:
        yield session
