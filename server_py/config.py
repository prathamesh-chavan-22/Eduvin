import os
from dotenv import load_dotenv

# Load .env from server_py/ directory (where config.py lives)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
# Also load from project root .env as fallback
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/edtech_lms")
SESSION_SECRET: str = os.environ.get("SESSION_SECRET", "development_secret")
PORT: int = int(os.environ.get("PORT", "5000"))

MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")
GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")

# Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy async
ASYNC_DATABASE_URL: str = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
