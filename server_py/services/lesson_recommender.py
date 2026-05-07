"""Lesson recommendation service for speaking module."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import SpeakingLesson, SpeakingTopic, UserLessonProgress
from storage import get_user_lesson_progress, get_speaking_lessons


async def recommend_next_lesson(db: AsyncSession, user_id: int) -> SpeakingLesson | None:
    """Recommend the next lesson for a user based on their progress.

    Logic:
    1. Find incomplete lessons at the user's current difficulty level
    2. If all lessons at current level are complete, move to next level
    3. Prioritize lessons user hasn't attempted yet
    4. Within same difficulty, prioritize lower sort_order

    Returns:
        Recommended lesson or None if no lessons available
    """
    # Get all progress for this user
    progress_records = await get_user_lesson_progress(db, user_id)

    # Build a map of lesson_id -> progress
    progress_map = {p.lesson_id: p for p in progress_records}

    # Get all lessons
    all_lessons = await get_speaking_lessons(db)

    if not all_lessons:
        return None

    # Determine current difficulty level based on completed lessons
    completed_lesson_ids = [p.lesson_id for p in progress_records if p.completed]

    if not completed_lesson_ids:
        # No completed lessons - start with level 1
        current_level = 1
    else:
        # Find highest completed difficulty level
        completed_lessons = [l for l in all_lessons if l.id in completed_lesson_ids]
        max_completed_level = max(l.difficulty_level for l in completed_lessons)

        # Check if all lessons at max completed level are done
        lessons_at_max_level = [l for l in all_lessons if l.difficulty_level == max_completed_level]
        all_completed_at_max = all(l.id in completed_lesson_ids for l in lessons_at_max_level)

        if all_completed_at_max:
            # Move to next level
            current_level = min(max_completed_level + 1, 5)
        else:
            # Continue at max completed level
            current_level = max_completed_level

    # Find lessons at current level
    candidate_lessons = [l for l in all_lessons if l.difficulty_level == current_level]

    # Filter out completed lessons
    incomplete_lessons = [l for l in candidate_lessons if l.id not in completed_lesson_ids]

    if not incomplete_lessons:
        # All lessons at this level complete, try next level
        current_level = min(current_level + 1, 5)
        candidate_lessons = [l for l in all_lessons if l.difficulty_level == current_level]
        incomplete_lessons = [l for l in candidate_lessons if l.id not in completed_lesson_ids]

    if not incomplete_lessons:
        # No more lessons available
        return None

    # Prioritize:
    # 1. Never attempted (not in progress_map)
    # 2. Attempted but not completed, ordered by best_score (lowest first)
    # 3. Within same priority, use sort_order

    never_attempted = [l for l in incomplete_lessons if l.id not in progress_map]

    if never_attempted:
        # Return first never-attempted lesson by sort_order
        return sorted(never_attempted, key=lambda l: l.sort_order)[0]

    # All have been attempted - find one with lowest score
    attempted_with_progress = [
        (l, progress_map[l.id]) for l in incomplete_lessons if l.id in progress_map
    ]

    # Sort by best_score (lowest first), then sort_order
    attempted_with_progress.sort(key=lambda x: (x[1].best_score or 0, x[0].sort_order))

    return attempted_with_progress[0][0] if attempted_with_progress else None


async def get_continue_lesson(db: AsyncSession, user_id: int) -> SpeakingLesson | None:
    """Get the lesson to continue - last practiced incomplete lesson.

    Returns:
        Most recently practiced incomplete lesson or None
    """
    # Get all progress for this user
    result = await db.execute(
        select(UserLessonProgress)
        .where(
            UserLessonProgress.user_id == user_id,
            UserLessonProgress.completed == False,
            UserLessonProgress.last_practiced_at.isnot(None),
        )
        .order_by(UserLessonProgress.last_practiced_at.desc())
    )
    progress = result.scalars().first()

    if not progress:
        return None

    # Get the lesson
    result = await db.execute(
        select(SpeakingLesson).where(SpeakingLesson.id == progress.lesson_id)
    )
    return result.scalar_one_or_none()


async def get_recommendations(db: AsyncSession, user_id: int) -> dict:
    """Get comprehensive recommendations for a user.

    Returns:
        Dictionary with:
        - continue_lesson: Last practiced incomplete lesson
        - next_lesson: Recommended next lesson
        - suggested_topics: Topics with incomplete lessons (filtered at DB level)
    """
    continue_lesson = await get_continue_lesson(db, user_id)
    next_lesson = await recommend_next_lesson(db, user_id)

    # Get all progress
    progress_records = await get_user_lesson_progress(db, user_id)
    completed_lesson_ids = {p.lesson_id for p in progress_records if p.completed}

    # Use a single query with a subquery for incomplete count (optimized from loading ALL lessons)
    topic_data = await db.execute(
        select(
            SpeakingTopic,
            func.count(SpeakingLesson.id).label("total"),
        )
        .outerjoin(SpeakingLesson, SpeakingLesson.topic_id == SpeakingTopic.id)
        .group_by(SpeakingTopic.id)
        .order_by(SpeakingTopic.sort_order)
    )

    # Fetch only lessons needed for incomplete count calculation
    suggested_topics = []
    for topic, total in topic_data.all():
        # Only query lessons for this specific topic (much smaller than ALL lessons)
        topic_lessons_result = await db.execute(
            select(SpeakingLesson.id).where(SpeakingLesson.topic_id == topic.id)
        )
        topic_lesson_ids = set(row[0] for row in topic_lessons_result.all())
        incomplete_count = len(topic_lesson_ids - completed_lesson_ids)

        if incomplete_count > 0:
            suggested_topics.append({
                "topic": topic,
                "incomplete_count": incomplete_count,
                "total_count": total,
            })
            if len(suggested_topics) >= 3:
                break  # Only need top 3

    return {
        "continue_lesson": continue_lesson,
        "next_lesson": next_lesson,
        "suggested_topics": suggested_topics,
    }
