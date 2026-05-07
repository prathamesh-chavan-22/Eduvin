import os
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from dependencies import require_auth
from models import AudioUpload
from services import groq_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])

# Audio storage directory
AUDIO_DIR = Path(__file__).parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Max file size: 25MB
MAX_FILE_SIZE = 25 * 1024 * 1024

# Allowed audio extensions
ALLOWED_EXTENSIONS = {".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"}


@router.post("/upload", status_code=201)
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    """
    Upload an audio file for transcription and mindmap generation.
    Returns immediately; processing happens in the background.
    """
    # Validate file extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content to check size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Save file to disk
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{user_id}_{timestamp}{file_ext}"
    file_path = AUDIO_DIR / safe_filename

    with open(file_path, "wb") as f:
        f.write(file_content)

    # Create database record
    audio_upload = AudioUpload(
        user_id=user_id,
        filename=file.filename or "unknown",
        file_path=str(file_path),
        status="uploading",
    )
    db.add(audio_upload)
    await db.commit()
    await db.refresh(audio_upload)

    # Update status to transcribing
    audio_upload.status = "transcribing"
    await db.commit()

    # Trigger background processing
    background_tasks.add_task(
        process_audio_background,
        audio_upload.id,
        str(file_path),
    )

    return {
        "id": audio_upload.id,
        "status": audio_upload.status,
        "message": "Audio uploaded. Processing in background."
    }


@router.get("/list")
async def list_audio_uploads(
    limit: int = 20,
    offset: int = 0,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's audio uploads with pagination."""
    # Validate manually since we're not using Query()
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")
    if offset < 0:
        raise HTTPException(status_code=400, detail="offset must be non-negative")

    result = await db.execute(
        select(AudioUpload)
        .where(AudioUpload.user_id == user_id)
        .order_by(AudioUpload.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    uploads = result.scalars().all()

    return [
        {
            "id": u.id,
            "filename": u.filename,
            "status": u.status,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
            "completedAt": u.completed_at.isoformat() if u.completed_at else None,
        }
        for u in uploads
    ]


@router.get("/{audio_id}")
async def get_audio_upload(
    audio_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    """Get audio upload details including transcript and mindmap."""
    result = await db.execute(
        select(AudioUpload).where(
            AudioUpload.id == audio_id,
            AudioUpload.user_id == user_id
        )
    )
    audio_upload = result.scalar_one_or_none()

    if not audio_upload:
        raise HTTPException(status_code=404, detail="Audio upload not found")

    return {
        "id": audio_upload.id,
        "filename": audio_upload.filename,
        "transcript": audio_upload.transcript,
        "mindmapData": audio_upload.mindmap_data,
        "status": audio_upload.status,
        "errorMessage": audio_upload.error_message,
        "createdAt": audio_upload.created_at.isoformat() if audio_upload.created_at else None,
        "completedAt": audio_upload.completed_at.isoformat() if audio_upload.completed_at else None,
    }


@router.delete("/{audio_id}", status_code=204)
async def delete_audio_upload(
    audio_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    """Delete an audio upload and its associated file."""
    result = await db.execute(
        select(AudioUpload).where(
            AudioUpload.id == audio_id,
            AudioUpload.user_id == user_id
        )
    )
    audio_upload = result.scalar_one_or_none()

    if not audio_upload:
        raise HTTPException(status_code=404, detail="Audio upload not found")

    # Delete file from disk
    if os.path.exists(audio_upload.file_path):
        os.remove(audio_upload.file_path)

    # Delete from database
    await db.delete(audio_upload)
    await db.commit()

    return None


async def process_audio_background(audio_id: int, file_path: str):
    """
    Background task to transcribe audio and generate mindmap.
    """
    from database import async_session_factory

    async with async_session_factory() as db:
        try:
            # Get the record
            result = await db.execute(
                select(AudioUpload).where(AudioUpload.id == audio_id)
            )
            audio_upload = result.scalar_one_or_none()

            if not audio_upload:
                logger.error(f"Audio upload {audio_id} not found during processing")
                return

            # Step 1: Transcribe audio
            logger.info(f"Transcribing audio {audio_id}")
            audio_upload.status = "transcribing"
            await db.commit()

            transcript = groq_service.transcribe_audio(file_path)
            audio_upload.transcript = transcript
            await db.commit()

            # Step 2: Generate mindmap
            logger.info(f"Generating mindmap for audio {audio_id}")
            audio_upload.status = "generating_mindmap"
            await db.commit()

            mindmap_data = None
            last_error = None
            
            # Try LLM generation with retry
            for attempt in range(1, 3):  # 2 attempts total
                try:
                    logger.info(f"Attempt {attempt} to generate mindmap for audio {audio_id}")
                    mindmap_data = await groq_service.generate_mindmap_from_transcript(transcript)
                    break  # Success, exit retry loop
                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"AI mindmap generation attempt {attempt} failed for audio {audio_id}: {e}"
                    )
                    if attempt < 2:
                        # Brief delay before retry
                        import asyncio
                        await asyncio.sleep(2)
            
            # Use fallback if all LLM attempts failed
            if mindmap_data is None:
                logger.warning(f"All LLM attempts failed for {audio_id}, using NLP-lite fallback")
                mindmap_data = groq_service.generate_fallback_mindmap(transcript)
                audio_upload.error_message = f"LLM generation failed after 2 attempts: {str(last_error)[:100]}. Using NLP-lite fallback."
            
            audio_upload.mindmap_data = mindmap_data

            # Mark as complete
            audio_upload.status = "ready"
            audio_upload.completed_at = datetime.utcnow()
            await db.commit()

            logger.info(f"Audio {audio_id} processing completed successfully")

        except Exception as e:
            logger.error(f"Error processing audio {audio_id}: {e}", exc_info=True)
            async with async_session_factory() as db_update:
                result = await db_update.execute(
                    select(AudioUpload).where(AudioUpload.id == audio_id)
                )
                audio = result.scalar_one_or_none()
                if audio:
                    audio.status = "failed"
                    audio.error_message = str(e)
                    await db_update.commit()
