import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from config import PORT
from database import async_session_factory, engine
from session import create_session_table
from seed import seed_database
from models import Base

from routers import auth, users, courses, enrollments, notifications, speaking, analysis, tutor, analytics, assessments, audio, exam_papers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await create_session_table()
    async with async_session_factory() as db:
        await seed_database(db)
    yield
    # Shutdown — nothing needed


app = FastAPI(lifespan=lifespan)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://lms.local:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handlers to match Express error format: {"message": "..."}
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"message": "Validation error"})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Error"
    return JSONResponse(status_code=exc.status_code, content={"message": message})


# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(enrollments.router)
app.include_router(notifications.router)
app.include_router(speaking.router)
app.include_router(analysis.router)
app.include_router(tutor.router)
app.include_router(analytics.router)
app.include_router(assessments.router)
app.include_router(audio.router)
app.include_router(exam_papers.router)


# Admin: reset + re-seed database
@app.post("/api/admin/reset-db")
async def reset_db():
    """Drop all tables, recreate schema, and re-seed."""
    from models import Base
    # Drop and recreate all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    # Recreate session table
    await create_session_table()
    # Re-seed
    async with async_session_factory() as db:
        await seed_database(db)
    return {"message": "Database reset and re-seeded successfully."}


# Static files for generated audio
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/api/static", StaticFiles(directory=static_dir), name="static")

# Static files for exam uploads
exam_upload_dir = os.path.join(os.path.dirname(__file__), "static", "exam-uploads")
os.makedirs(exam_upload_dir, exist_ok=True)
app.mount("/api/exam-uploads", StaticFiles(directory=exam_upload_dir), name="exam-uploads")

# Production: serve static files from dist/ (built by Vite)
dist_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
