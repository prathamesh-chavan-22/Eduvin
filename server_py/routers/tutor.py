import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth
from schemas import (
    TutorMessageOut, TutorChatInput, LearnerProfileOut,
    UpdateLearnerProfile, ErrorResponse,
)
import storage
from services.tutor_ai import get_tutor_response, compute_updated_profile
from services.edge_tts_service import generate_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


@router.post("/chat")
async def tutor_chat(
    body: TutorChatInput,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI tutor and get a response with audio."""

    # 1. Fetch the module content
    modules = await storage.get_course_modules(db, body.course_id)
    target_module = None
    for m in modules:
        if m.id == body.module_id:
            target_module = m
            break

    if not target_module:
        return Response(
            content=ErrorResponse(message="Module not found").model_dump_json(),
            status_code=404,
            media_type="application/json",
        )

    # 2. Get learner profile
    profile = await storage.get_or_create_learner_profile(db, user_id)

    # 3. Get conversation history
    history_messages = await storage.get_tutor_history(db, user_id, body.course_id, limit=10)
    history = [{"role": m.role, "content": m.content} for m in history_messages]

    # 4. Save user message
    await storage.create_tutor_message(
        db, user_id=user_id, course_id=body.course_id,
        module_id=body.module_id, role="user", content=body.message,
    )

    # 5. Get AI response
    try:
        ai_text = await get_tutor_response(
            module_content=target_module.content,
            module_title=target_module.title,
            user_message=body.message,
            history=history,
            learner_profile=profile,
        )
    except Exception as e:
        logger.error(f"Tutor AI call failed: {e}")
        ai_text = "I'm sorry, I'm having trouble right now. Please try asking again in a moment."

    # 6. Generate audio for the response
    audio_url = None
    try:
        # Clean markdown for TTS (strip markdown formatting)
        tts_text = ai_text.replace("**", "").replace("##", "").replace("###", "")
        tts_text = tts_text.replace("```", "").replace("`", "")
        if len(tts_text) > 3000:
            tts_text = tts_text[:3000] + "..."

        filename = f"tutor_{user_id}_{body.course_id}_{body.module_id}_{abs(hash(ai_text)) % 100000}.mp3"
        audio_url = await generate_audio(tts_text, filename)
    except Exception as e:
        logger.warning(f"TTS failed for tutor response: {e}")

    # 7. Save AI message
    ai_msg = await storage.create_tutor_message(
        db, user_id=user_id, course_id=body.course_id,
        module_id=body.module_id, role="assistant", content=ai_text,
        audio_url=audio_url,
    )

    return TutorMessageOut.model_validate(ai_msg).model_dump(by_alias=True)


@router.get("/history/{course_id}")
async def get_history(
    course_id: int,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get tutor chat history for a course."""
    messages = await storage.get_tutor_history(db, user_id, course_id, limit=50)
    return [TutorMessageOut.model_validate(m).model_dump(by_alias=True) for m in messages]


@router.get("/profile")
async def get_profile(
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get the current learner's adaptive profile."""
    profile = await storage.get_or_create_learner_profile(db, user_id)
    return LearnerProfileOut.model_validate(profile).model_dump(by_alias=True)


@router.post("/profile/update")
async def update_profile(
    body: UpdateLearnerProfile,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update learner profile after a quiz completion."""
    profile = await storage.get_or_create_learner_profile(db, user_id)
    updates = compute_updated_profile(profile, body.quiz_score, body.module_title)
    updated = await storage.update_learner_profile(db, user_id, **updates)
    return LearnerProfileOut.model_validate(updated).model_dump(by_alias=True)
