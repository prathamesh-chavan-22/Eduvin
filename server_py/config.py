import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/edtech_lms")
SESSION_SECRET: str = os.environ.get("SESSION_SECRET", "development_secret")
PORT: int = int(os.environ.get("PORT", "5000"))

MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")

# Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy async
ASYNC_DATABASE_URL: str = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
