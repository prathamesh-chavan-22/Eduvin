import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth
from schemas import (
    SpeakingPracticeOut, SpeakingTopicOut, SpeakingLessonOut,
    UserLessonProgressOut
)
import storage
from services.mistral_ai import analyze_speaking_transcript
from services.edge_tts_service import generate_audio
from services.lesson_recommender import get_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/speaking", tags=["speaking"])


@router.get("")
async def list_practices(user_id: int = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    practices = await storage.get_speaking_practices(db, user_id)
    return [SpeakingPracticeOut.model_validate(p).model_dump(by_alias=True) for p in practices]


@router.post("", status_code=201)
async def create_practice(
    body: dict,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Receive prompt + transcript, run AI analysis, store and return results."""
    prompt = body.get("prompt", "")
    transcript = body.get("transcript", "")
    lesson_id = body.get("lessonId")
    audio_url = body.get("audioUrl")
    
    # Get user's language preference
    user = await storage.get_user(db, user_id)
    language = user.preferred_language if user and user.preferred_language else "en"
    
    # Get lesson details for target vocabulary if lesson_id provided
    target_vocabulary = None
    if lesson_id:
        lesson = await storage.get_speaking_lesson(db, lesson_id)
        if lesson and lesson.target_vocabulary:
            target_vocabulary = lesson.target_vocabulary

    # AI-powered analysis
    analysis = {
        "pronunciation_score": 75.0,
        "fluency_score": 75.0,
        "vocabulary_score": 75.0,
        "grammar_score": 75.0,
        "feedback": "Keep practicing!",
        "corrections": ""
    }
    try:
        analysis = await analyze_speaking_transcript(
            prompt, transcript, language=language, target_vocabulary=target_vocabulary
        )
    except Exception as e:
        logger.warning(f"Speaking AI analysis failed: {e}")

    # Calculate overall score
    overall_score = (
        analysis.get("pronunciation_score", 75.0) +
        analysis.get("fluency_score", 75.0) +
        analysis.get("vocabulary_score", 75.0) +
        analysis.get("grammar_score", 75.0)
    ) / 4.0

    practice = await storage.create_speaking_practice(
        db, user_id=user_id, prompt=prompt,
        transcript=transcript,
        audio_url=audio_url,
        lesson_id=lesson_id,
        pronunciation_score=analysis.get("pronunciation_score"),
        fluency_score=analysis.get("fluency_score"),
        vocabulary_score=analysis.get("vocabulary_score"),
        grammar_score=analysis.get("grammar_score"),
        feedback=analysis.get("feedback"),
        corrections=analysis.get("corrections"),
    )
    
    # Update lesson progress if lesson_id provided
    if lesson_id:
        try:
            await storage.update_lesson_progress(db, user_id, lesson_id, overall_score)
        except Exception as e:
            logger.warning(f"Failed to update lesson progress: {e}")

    # Fire notification
    try:
        await storage.create_notification(
            db, user_id=user_id,
            title="Speaking Practice Analyzed",
            message=f"Your practice has been analyzed. Overall score: {round(overall_score)}%.",
        )
    except Exception:
        pass

    return SpeakingPracticeOut.model_validate(practice).model_dump(by_alias=True)


# --- Topics ---


@router.get("/topics")
async def list_topics(
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get all speaking topics with progress information."""
    topics = await storage.get_speaking_topics(db)

    # Batch progress for all topics in 2 queries instead of 2×N
    topic_ids = [t.id for t in topics]
    progress_map = await storage.get_topic_progress_batch(db, user_id, topic_ids)

    result = []
    for topic in topics:
        topic_dict = SpeakingTopicOut.model_validate(topic).model_dump(by_alias=True)
        topic_dict["progress"] = progress_map.get(topic.id, {
            "total_lessons": 0, "completed_lessons": 0,
            "completion_pct": 0, "avg_score": 0,
        })
        result.append(topic_dict)

    return result


@router.get("/topics/{topic_id}")
async def get_topic(
    topic_id: int,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific topic with its lessons."""
    topic = await storage.get_speaking_topic(db, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    lessons = await storage.get_speaking_lessons(db, topic_id=topic_id)
    
    # Add progress info
    progress_info = await storage.get_topic_progress(db, user_id, topic_id)
    
    topic_dict = SpeakingTopicOut.model_validate(topic).model_dump(by_alias=True)
    topic_dict["lessons"] = [SpeakingLessonOut.model_validate(l).model_dump(by_alias=True) for l in lessons]
    topic_dict["progress"] = progress_info
    
    return topic_dict


# --- Lessons ---


@router.get("/lessons")
async def list_lessons(
    topic_id: Optional[int] = Query(None, alias="topicId"),
    difficulty_level: Optional[int] = Query(None, alias="difficultyLevel"),
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get lessons filtered by topic and/or difficulty level."""
    lessons = await storage.get_speaking_lessons(db, topic_id=topic_id, difficulty_level=difficulty_level)
    
    # Get user progress for these lessons
    progress_records = await storage.get_user_lesson_progress(db, user_id)
    progress_map = {p.lesson_id: p for p in progress_records}
    
    result = []
    for lesson in lessons:
        lesson_dict = SpeakingLessonOut.model_validate(lesson).model_dump(by_alias=True)
        progress = progress_map.get(lesson.id)
        if progress:
            lesson_dict["progress"] = UserLessonProgressOut.model_validate(progress).model_dump(by_alias=True)
        else:
            lesson_dict["progress"] = None
        result.append(lesson_dict)
    
    return result


@router.get("/lessons/{lesson_id}")
async def get_lesson(
    lesson_id: int,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific lesson with its details and user progress."""
    lesson = await storage.get_speaking_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Get user's language preference
    user = await storage.get_user(db, user_id)
    language = user.preferred_language if user and user.preferred_language else "en"
    
    # Get the prompt in user's language
    prompt_map = {
        "en": lesson.prompt_template_en,
        "hi": lesson.prompt_template_hi or lesson.prompt_template_en,
        "mr": lesson.prompt_template_mr or lesson.prompt_template_en,
    }
    prompt = prompt_map.get(language, lesson.prompt_template_en)
    
    # Generate audio for the prompt if not already generated
    try:
        import hashlib
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
        audio_filename = f"lesson_{lesson_id}_{language}_{prompt_hash}.mp3"
        audio_url = await generate_audio(prompt, audio_filename, language=language)
    except Exception as e:
        logger.warning(f"Failed to generate audio for lesson {lesson_id}: {e}")
        audio_url = None
    
    # Get user progress
    progress_records = await storage.get_user_lesson_progress(db, user_id, lesson_id=lesson_id)
    progress = progress_records[0] if progress_records else None
    
    lesson_dict = SpeakingLessonOut.model_validate(lesson).model_dump(by_alias=True)
    lesson_dict["prompt"] = prompt
    lesson_dict["audioUrl"] = audio_url
    lesson_dict["progress"] = UserLessonProgressOut.model_validate(progress).model_dump(by_alias=True) if progress else None
    
    return lesson_dict


# --- Progress ---


@router.get("/progress")
async def get_progress(
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get user's overall speaking progress."""
    # Get all progress records
    progress_records = await storage.get_user_lesson_progress(db, user_id)
    
    # Get all topics with progress
    topics = await storage.get_speaking_topics(db)
    topic_progress = []
    
    for topic in topics:
        progress_info = await storage.get_topic_progress(db, user_id, topic.id)
        topic_dict = SpeakingTopicOut.model_validate(topic).model_dump(by_alias=True)
        topic_dict["progress"] = progress_info
        topic_progress.append(topic_dict)
    
    # Calculate overall stats
    total_lessons = len(await storage.get_speaking_lessons(db))
    completed_lessons = sum(1 for p in progress_records if p.completed)
    total_attempts = sum(p.attempts for p in progress_records)
    avg_score = sum(p.best_score for p in progress_records if p.best_score) / len(progress_records) if progress_records else 0
    
    return {
        "totalLessons": total_lessons,
        "completedLessons": completed_lessons,
        "completionPct": (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0,
        "totalAttempts": total_attempts,
        "avgScore": round(avg_score, 1),
        "topicProgress": topic_progress,
    }


# --- Recommendations ---


@router.get("/recommendations")
async def get_lesson_recommendations(
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized lesson recommendations."""
    recommendations = await get_recommendations(db, user_id)
    
    result = {
        "continueLesson": None,
        "nextLesson": None,
        "suggestedTopics": [],
    }
    
    if recommendations["continue_lesson"]:
        lesson = recommendations["continue_lesson"]
        result["continueLesson"] = SpeakingLessonOut.model_validate(lesson).model_dump(by_alias=True)
    
    if recommendations["next_lesson"]:
        lesson = recommendations["next_lesson"]
        result["nextLesson"] = SpeakingLessonOut.model_validate(lesson).model_dump(by_alias=True)
    
    for suggestion in recommendations["suggested_topics"]:
        topic_dict = SpeakingTopicOut.model_validate(suggestion["topic"]).model_dump(by_alias=True)
        topic_dict["incompleteCount"] = suggestion["incomplete_count"]
        topic_dict["totalCount"] = suggestion["total_count"]
        result["suggestedTopics"].append(topic_dict)
    
    return result
