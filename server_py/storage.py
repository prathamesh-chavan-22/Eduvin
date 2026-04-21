from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Course, CourseModule, CourseConceptGraph, Enrollment, Notification, SpeakingPractice, SpeakingTopic, SpeakingLesson, UserLessonProgress, WorkflowAnalysis, AnalysisResult, LearnerProfile, TutorMessage, ExamPaper, ExamPaperConfig, ExamAttempt


# --- Users ---


async def get_user(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, *, email: str, password: str, full_name: str, role: str = "employee") -> User:
    user = User(email=email, password=password, full_name=full_name, role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_users(db: AsyncSession) -> List[User]:
    result = await db.execute(select(User))
    return list(result.scalars().all())


# --- Courses ---


async def get_courses(db: AsyncSession) -> List[dict]:
    result = await db.execute(select(Course))
    courses = list(result.scalars().all())
    out = []
    for c in courses:
        creator = await get_user(db, c.created_by) if c.created_by else None
        out.append({"course": c, "creator": creator})
    return out


async def get_course(db: AsyncSession, course_id: int) -> dict | None:
    """Fetch course with creator and modules in 2 queries (optimized from O(N) queries)."""
    # Single query for course
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        return None
    
    # Single query for all modules (was 1 query per module)
    modules_result = await db.execute(
        select(CourseModule).where(CourseModule.course_id == course.id).order_by(CourseModule.sort_order)
    )
    modules = list(modules_result.scalars().all())
    
    # Single query for creator (only if needed)
    creator = None
    if course.created_by:
        creator_result = await db.execute(select(User).where(User.id == course.created_by))
        creator = creator_result.scalar_one_or_none()
    
    return {"course": course, "modules": modules, "creator": creator}


async def create_course(db: AsyncSession, *, title: str, description: str, status: str = "draft",
                        created_by: int | None = None, objectives: list[str] | None = None,
                        audience: str | None = None, depth: str | None = None) -> Course:
    course = Course(title=title, description=description, status=status,
                    created_by=created_by, objectives=objectives, audience=audience, depth=depth)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


async def update_course_generation_status(db: AsyncSession, course_id: int,
                                           status: str, progress: str | None = None) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        return None
    course.generation_status = status
    if progress is not None:
        course.generation_progress = progress
    await db.commit()
    await db.refresh(course)
    return course


async def update_course_details(db: AsyncSession, course_id: int, *,
                                 title: str | None = None, description: str | None = None,
                                 objectives: list[str] | None = None) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        return None
    if title is not None:
        course.title = title
    if description is not None:
        course.description = description
    if objectives is not None:
        course.objectives = objectives
    await db.commit()
    await db.refresh(course)
    return course


async def update_module_audio(db: AsyncSession, module_id: int, audio_url: str) -> CourseModule | None:
    result = await db.execute(select(CourseModule).where(CourseModule.id == module_id))
    module = result.scalar_one_or_none()
    if module is None:
        return None
    module.audio_url = audio_url
    await db.commit()
    await db.refresh(module)
    return module


# --- Modules ---


async def get_course_modules(db: AsyncSession, course_id: int) -> List[CourseModule]:
    result = await db.execute(select(CourseModule).where(CourseModule.course_id == course_id))
    return list(result.scalars().all())


async def create_course_module(db: AsyncSession, *, course_id: int, title: str, content: str,
                               sort_order: int = 0, quiz: str | None = None,
                               audio_url: str | None = None, images: list | None = None) -> CourseModule:
    module = CourseModule(course_id=course_id, title=title, content=content,
                          sort_order=sort_order, quiz=quiz, audio_url=audio_url, images=images)
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


async def get_course_concept_graph(db: AsyncSession, course_id: int) -> CourseConceptGraph | None:
    result = await db.execute(
        select(CourseConceptGraph).where(CourseConceptGraph.course_id == course_id)
    )
    return result.scalar_one_or_none()


async def upsert_course_concept_graph(
    db: AsyncSession,
    *,
    course_id: int,
    mermaid: str,
    status: str = "ready",
    nodes: list | None = None,
    edges: list | None = None,
) -> CourseConceptGraph:
    graph = await get_course_concept_graph(db, course_id)
    if graph is None:
        graph = CourseConceptGraph(
            course_id=course_id,
            mermaid=mermaid,
            status=status,
            nodes=nodes,
            edges=edges,
        )
        db.add(graph)
    else:
        graph.mermaid = mermaid
        graph.status = status
        graph.nodes = nodes
        graph.edges = edges

    await db.commit()
    await db.refresh(graph)
    return graph


# --- Enrollments ---


async def get_enrollments(db: AsyncSession, user_id: int | None = None) -> List[dict]:
    """Fetch enrollments with batch queries (was O(M×N) queries, now O(1))."""
    # 1. Fetch all enrollments
    stmt = select(Enrollment)
    if user_id is not None:
        stmt = stmt.where(Enrollment.user_id == user_id)
    result = await db.execute(stmt)
    enrollments = list(result.scalars().all())
    
    if not enrollments:
        return []
    
    # 2. Batch-fetch courses for all unique course IDs
    course_ids = [e.course_id for e in enrollments if e.course_id]
    courses_map = {}
    if course_ids:
        courses_result = await db.execute(select(Course).where(Course.id.in_(course_ids)))
        for course in courses_result.scalars().all():
            courses_map[course.id] = course
    
    # 3. Batch-fetch modules for all courses
    modules_map = {}
    if course_ids:
        modules_result = await db.execute(
            select(CourseModule).where(CourseModule.course_id.in_(course_ids)).order_by(CourseModule.sort_order)
        )
        for mod in modules_result.scalars().all():
            modules_map.setdefault(mod.course_id, []).append(mod)
    
    # 4. Batch-fetch users (creators + enrollment users)
    user_ids = set()
    for e in enrollments:
        if e.user_id:
            user_ids.add(e.user_id)
        course = courses_map.get(e.course_id)
        if course and course.created_by:
            user_ids.add(course.created_by)
    
    users_map = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for user in users_result.scalars().all():
            users_map[user.id] = user
    
    # 5. Assemble result
    out = []
    for e in enrollments:
        course_data = None
        if e.course_id and e.course_id in courses_map:
            course = courses_map[e.course_id]
            creator = users_map.get(course.created_by) if course.created_by else None
            course_data = {
                "course": course,
                "modules": modules_map.get(e.course_id, []),
                "creator": creator,
            }
        user = users_map.get(e.user_id) if e.user_id else None
        out.append({"enrollment": e, "course": course_data, "user": user})
    
    return out


async def get_enrollment(db: AsyncSession, enrollment_id: int) -> dict | None:
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if enrollment is None:
        return None
    course_data = await get_course(db, enrollment.course_id) if enrollment.course_id else None
    user = await get_user(db, enrollment.user_id) if enrollment.user_id else None
    return {"enrollment": enrollment, "course": course_data, "user": user}


async def create_enrollment(db: AsyncSession, *, user_id: int, course_id: int,
                            status: str = "assigned", progress_pct: int = 0) -> Enrollment:
    # Check if enrollment already exists
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Return existing enrollment instead of creating a duplicate
        return existing
    
    enrollment = Enrollment(user_id=user_id, course_id=course_id, status=status,
                            progress_pct=progress_pct, started_at=datetime.utcnow())
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def update_enrollment_progress(db: AsyncSession, enrollment_id: int,
                                     progress_pct: int, status: str | None = None) -> Enrollment | None:
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if enrollment is None:
        return None

    enrollment.progress_pct = progress_pct
    if status:
        enrollment.status = status
    if progress_pct == 100:
        enrollment.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(enrollment)
    return enrollment


# --- Notifications ---


async def get_notifications(db: AsyncSession, user_id: int) -> List[Notification]:
    result = await db.execute(select(Notification).where(Notification.user_id == user_id))
    return list(result.scalars().all())


async def create_notification(db: AsyncSession, *, user_id: int, title: str,
                              message: str, is_read: bool = False) -> Notification:
    notification = Notification(user_id=user_id, title=title, message=message, is_read=is_read)
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def mark_notification_read(db: AsyncSession, notification_id: int) -> Notification | None:
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if notification is None:
        return None
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


# --- Speaking Practice ---


async def get_speaking_practices(db: AsyncSession, user_id: int) -> List[SpeakingPractice]:
    result = await db.execute(
        select(SpeakingPractice)
        .where(SpeakingPractice.user_id == user_id)
        .order_by(desc(SpeakingPractice.created_at))
    )
    return list(result.scalars().all())


async def create_speaking_practice(db: AsyncSession, *, user_id: int, prompt: str,
                                   transcript: str | None = None, audio_url: str | None = None,
                                   pronunciation_score: float | None = None,
                                   fluency_score: float | None = None,
                                   vocabulary_score: float | None = None,
                                   grammar_score: float | None = None,
                                   feedback: str | None = None,
                                   corrections: str | None = None,
                                   lesson_id: int | None = None) -> SpeakingPractice:
    practice = SpeakingPractice(
        user_id=user_id, prompt=prompt, transcript=transcript, audio_url=audio_url,
        pronunciation_score=pronunciation_score, fluency_score=fluency_score,
        vocabulary_score=vocabulary_score, grammar_score=grammar_score,
        feedback=feedback, corrections=corrections, lesson_id=lesson_id,
    )
    db.add(practice)
    await db.commit()
    await db.refresh(practice)
    return practice


# --- Speaking Topics ---


async def get_speaking_topics(db: AsyncSession) -> List[SpeakingTopic]:
    result = await db.execute(
        select(SpeakingTopic).order_by(SpeakingTopic.sort_order)
    )
    return list(result.scalars().all())


async def get_speaking_topic(db: AsyncSession, topic_id: int) -> SpeakingTopic | None:
    result = await db.execute(
        select(SpeakingTopic).where(SpeakingTopic.id == topic_id)
    )
    return result.scalar_one_or_none()


async def create_speaking_topic(db: AsyncSession, *, name: str, description: str,
                                icon: str | None = None, sort_order: int = 0) -> SpeakingTopic:
    topic = SpeakingTopic(
        name=name, description=description, icon=icon, sort_order=sort_order
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


# --- Speaking Lessons ---


async def get_speaking_lessons(db: AsyncSession, topic_id: int | None = None,
                               difficulty_level: int | None = None) -> List[SpeakingLesson]:
    query = select(SpeakingLesson)
    if topic_id is not None:
        query = query.where(SpeakingLesson.topic_id == topic_id)
    if difficulty_level is not None:
        query = query.where(SpeakingLesson.difficulty_level == difficulty_level)
    query = query.order_by(SpeakingLesson.sort_order)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_speaking_lesson(db: AsyncSession, lesson_id: int) -> SpeakingLesson | None:
    result = await db.execute(
        select(SpeakingLesson).where(SpeakingLesson.id == lesson_id)
    )
    return result.scalar_one_or_none()


async def create_speaking_lesson(db: AsyncSession, *, topic_id: int, title: str,
                                 description: str, difficulty_level: int,
                                 prompt_template_en: str, prompt_template_hi: str | None = None,
                                 prompt_template_mr: str | None = None,
                                 target_vocabulary: list | None = None,
                                 example_response: str | None = None,
                                 sort_order: int = 0) -> SpeakingLesson:
    lesson = SpeakingLesson(
        topic_id=topic_id, title=title, description=description,
        difficulty_level=difficulty_level, prompt_template_en=prompt_template_en,
        prompt_template_hi=prompt_template_hi, prompt_template_mr=prompt_template_mr,
        target_vocabulary=target_vocabulary, example_response=example_response,
        sort_order=sort_order
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


# --- User Lesson Progress ---


async def get_user_lesson_progress(db: AsyncSession, user_id: int,
                                   lesson_id: int | None = None) -> List[UserLessonProgress]:
    query = select(UserLessonProgress).where(UserLessonProgress.user_id == user_id)
    if lesson_id is not None:
        query = query.where(UserLessonProgress.lesson_id == lesson_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_or_create_lesson_progress(db: AsyncSession, user_id: int,
                                        lesson_id: int) -> UserLessonProgress:
    result = await db.execute(
        select(UserLessonProgress).where(
            UserLessonProgress.user_id == user_id,
            UserLessonProgress.lesson_id == lesson_id
        )
    )
    progress = result.scalar_one_or_none()
    if not progress:
        progress = UserLessonProgress(
            user_id=user_id, lesson_id=lesson_id, attempts=0, completed=False
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
    return progress


async def update_lesson_progress(db: AsyncSession, user_id: int, lesson_id: int,
                                 score: float) -> UserLessonProgress:
    progress = await get_or_create_lesson_progress(db, user_id, lesson_id)
    progress.attempts += 1
    progress.last_practiced_at = datetime.now()
    
    # Update best score if this is better
    if progress.best_score is None or score > progress.best_score:
        progress.best_score = score
    
    # Mark as completed if score is 70% or higher
    if score >= 70.0 and not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.now()
    
    await db.commit()
    await db.refresh(progress)
    return progress


async def get_topic_progress(db: AsyncSession, user_id: int, topic_id: int) -> dict:
    """Get progress summary for a topic."""
    # Get all lessons for this topic
    lessons = await get_speaking_lessons(db, topic_id=topic_id)
    lesson_ids = [lesson.id for lesson in lessons]

    # Get progress for these lessons
    result = await db.execute(
        select(UserLessonProgress).where(
            UserLessonProgress.user_id == user_id,
            UserLessonProgress.lesson_id.in_(lesson_ids)
        )
    )
    progress_records = list(result.scalars().all())

    total_lessons = len(lessons)
    completed_lessons = sum(1 for p in progress_records if p.completed)
    avg_score = sum(p.best_score for p in progress_records if p.best_score) / len(progress_records) if progress_records else 0

    return {
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "completion_pct": (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0,
        "avg_score": avg_score,
    }


async def get_topic_progress_batch(db: AsyncSession, user_id: int, topic_ids: list[int]) -> dict[int, dict]:
    """Get progress for multiple topics in 2 queries instead of 2×N (performance optimized)."""
    if not topic_ids:
        return {}
    
    # 1. Fetch all lessons for these topics
    lessons_result = await db.execute(
        select(SpeakingLesson).where(SpeakingLesson.topic_id.in_(topic_ids))
    )
    lessons = list(lessons_result.scalars().all())
    lesson_ids = [l.id for l in lessons]
    
    # Build map: topic_id -> list of lesson_ids
    lesson_by_topic: dict[int, list[int]] = {}
    for l in lessons:
        lesson_by_topic.setdefault(l.topic_id, []).append(l.id)

    # 2. Fetch all progress for these lessons in one query
    progress_result = await db.execute(
        select(UserLessonProgress).where(
            UserLessonProgress.user_id == user_id,
            UserLessonProgress.lesson_id.in_(lesson_ids)
        )
    )
    progress_records = list(progress_result.scalars().all())
    progress_map = {p.lesson_id: p for p in progress_records}

    # 3. Compute in memory
    result = {}
    for tid in topic_ids:
        topic_lesson_ids = lesson_by_topic.get(tid, [])
        total = len(topic_lesson_ids)
        completed = sum(1 for lid in topic_lesson_ids if progress_map.get(lid) and progress_map[lid].completed)
        scores = [progress_map[lid].best_score for lid in topic_lesson_ids if progress_map.get(lid) and progress_map[lid].best_score]
        result[tid] = {
            "total_lessons": total,
            "completed_lessons": completed,
            "completion_pct": (completed / total * 100) if total > 0 else 0,
            "avg_score": sum(scores) / len(scores) if scores else 0,
        }
    return result


# --- User Language Preference ---


async def update_user_language(db: AsyncSession, user_id: int, language: str) -> User | None:
    result = await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(preferred_language=language)
        .returning(User)
    )
    await db.commit()
    return result.scalar_one_or_none()


# --- Workflow Analysis ---


async def get_analyses(db: AsyncSession, user_id: int) -> List[WorkflowAnalysis]:
    result = await db.execute(
        select(WorkflowAnalysis)
        .where(WorkflowAnalysis.created_by == user_id)
        .order_by(desc(WorkflowAnalysis.created_at))
    )
    return list(result.scalars().all())


async def get_analysis(db: AsyncSession, analysis_id: int) -> dict | None:
    result = await db.execute(select(WorkflowAnalysis).where(WorkflowAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis is None:
        return None
    results = await get_analysis_results(db, analysis.id)
    return {"analysis": analysis, "results": results}


async def get_analysis_results(db: AsyncSession, analysis_id: int) -> List[AnalysisResult]:
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)
    )
    return list(result.scalars().all())


async def create_analysis(db: AsyncSession, *, created_by: int, filename: str,
                           status: str = "processing", column_mapping: dict | None = None,
                           total_employees: int = 0) -> WorkflowAnalysis:
    analysis = WorkflowAnalysis(
        created_by=created_by, filename=filename, status=status,
        column_mapping=column_mapping, total_employees=total_employees,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis


async def update_analysis_status(db: AsyncSession, analysis_id: int,
                                  status: str, total_employees: int | None = None,
                                  column_mapping: dict | None = None) -> WorkflowAnalysis | None:
    result = await db.execute(select(WorkflowAnalysis).where(WorkflowAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis is None:
        return None
    analysis.status = status
    if total_employees is not None:
        analysis.total_employees = total_employees
    if column_mapping is not None:
        analysis.column_mapping = column_mapping
    if status == "completed" or status == "failed":
        analysis.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(analysis)
    return analysis


async def create_analysis_result(db: AsyncSession, *, analysis_id: int, employee_name: str,
                                  department: str | None = None, manager_remarks: str | None = None,
                                  ai_summary: str | None = None, recommended_skills: list | None = None,
                                  matched_course_ids: list | None = None,
                                  suggested_trainings: list | None = None) -> AnalysisResult:
    ar = AnalysisResult(
        analysis_id=analysis_id, employee_name=employee_name, department=department,
        manager_remarks=manager_remarks, ai_summary=ai_summary,
        recommended_skills=recommended_skills, matched_course_ids=matched_course_ids,
        suggested_trainings=suggested_trainings,
    )
    db.add(ar)
    await db.commit()
    await db.refresh(ar)
    return ar


# --- AI Tutor ---


async def get_or_create_learner_profile(db: AsyncSession, user_id: int) -> "LearnerProfile":
    result = await db.execute(select(LearnerProfile).where(LearnerProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = LearnerProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_learner_profile(db: AsyncSession, user_id: int, **fields) -> "LearnerProfile":
    profile = await get_or_create_learner_profile(db, user_id)
    for key, value in fields.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_tutor_history(db: AsyncSession, user_id: int, course_id: int, limit: int = 20) -> list["TutorMessage"]:
    result = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.user_id == user_id, TutorMessage.course_id == course_id)
        .order_by(desc(TutorMessage.created_at))
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()  # oldest first
    return messages


async def create_tutor_message(db: AsyncSession, *, user_id: int, course_id: int,
                               module_id: int | None = None, role: str, content: str,
                               audio_url: str | None = None) -> "TutorMessage":
    msg = TutorMessage(
        user_id=user_id, course_id=course_id, module_id=module_id,
        role=role, content=content, audio_url=audio_url,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# --- Assessment ---


async def get_available_assessments(db: AsyncSession, user_id: int) -> list[dict]:
    """Return modules with quiz data in courses the user is enrolled in, excluding already-submitted."""
    from sqlalchemy import text
    stmt = text("""
        SELECT cm.id as module_id, cm.title as module_title, cm.quiz,
               c.id as course_id, c.title as course_title,
               e.id as enrollment_id
        FROM course_modules cm
        JOIN courses c ON c.id = cm.course_id
        JOIN enrollments e ON e.course_id = c.id AND e.user_id = :user_id
        WHERE cm.quiz IS NOT NULL AND cm.quiz != ''
          AND cm.id NOT IN (
            SELECT module_id FROM assessments WHERE user_id = :user_id
          )
        ORDER BY c.title, cm.sort_order
    """)
    result = await db.execute(stmt, {"user_id": user_id})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_assessment_history(db: AsyncSession, user_id: int) -> list["Assessment"]:
    from models import Assessment
    result = await db.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(desc(Assessment.submitted_at))
    )
    return list(result.scalars().all())


async def create_assessment(db: AsyncSession, *, user_id: int, course_id: int,
                            module_id: int, score: float, answers: list) -> "Assessment":
    from models import Assessment
    assessment = Assessment(
        user_id=user_id, course_id=course_id, module_id=module_id,
        score=score, answers=answers,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    # Update learner profile avg quiz score
    history = await get_assessment_history(db, user_id)
    avg = sum(a.score for a in history) / len(history) if history else score
    await update_learner_profile(db, user_id, avg_quiz_score=round(avg, 1))
    return assessment


# --- Analytics ---


async def get_analytics_dashboard(db: AsyncSession) -> dict:
    from sqlalchemy import func as sqlfunc, cast, Date
    from models import Enrollment, LearnerProfile, User

    # Completion rate
    total_q = await db.execute(select(sqlfunc.count()).select_from(Enrollment))
    total = total_q.scalar() or 1
    completed_q = await db.execute(
        select(sqlfunc.count()).select_from(Enrollment).where(Enrollment.status == "completed")
    )
    completed = completed_q.scalar() or 0
    completion_rate = round(completed / total * 100, 1)

    # Avg quiz score from learner profiles
    avg_q = await db.execute(select(sqlfunc.avg(LearnerProfile.avg_quiz_score)))
    avg_quiz = round(float(avg_q.scalar() or 0), 1)

    # At-risk: low progress OR low quiz score (LIMIT to 50 to prevent unbounded result sets)
    at_risk_q = await db.execute(
        select(Enrollment, User, LearnerProfile)
        .join(User, User.id == Enrollment.user_id)
        .outerjoin(LearnerProfile, LearnerProfile.user_id == Enrollment.user_id)
        .where(
            (Enrollment.progress_pct < 30) | (LearnerProfile.avg_quiz_score < 50)
        )
        .limit(50)  # Cap at 50 at-risk users for dashboard display
    )
    at_risk_rows = at_risk_q.all()
    seen_users = set()
    at_risk = []
    for row in at_risk_rows:
        e, u, lp = row
        if u.id in seen_users:
            continue
        seen_users.add(u.id)
        at_risk.append({
            "name": u.full_name,
            "email": u.email,
            "progress": e.progress_pct,
            "quiz_score": lp.avg_quiz_score if lp else 0,
            "course": "See enrollments",
        })

    # Completion trend over last 6 weeks
    from sqlalchemy import text
    trend_q = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('week', COALESCE(completed_at, started_at)), 'Mon DD') AS week,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) AS total
        FROM enrollments
        WHERE COALESCE(completed_at, started_at) >= NOW() - INTERVAL '42 days'
        GROUP BY DATE_TRUNC('week', COALESCE(completed_at, started_at))
        ORDER BY DATE_TRUNC('week', COALESCE(completed_at, started_at))
    """))
    trend_rows = trend_q.mappings().all()
    trend = []
    for r in trend_rows:
        pct = round(r["completed"] / r["total"] * 100, 0) if r["total"] else 0
        trend.append({"name": r["week"], "rate": pct})
    if not trend:
        # fallback if no data yet
        trend = [{"name": "Week 1", "rate": 0}]

    # Score by user for bar chart (LIMIT to 100 to cap payload size)
    score_q = await db.execute(
        select(User.full_name, LearnerProfile.avg_quiz_score)
        .join(LearnerProfile, LearnerProfile.user_id == User.id)
        .where(LearnerProfile.avg_quiz_score > 0)
        .limit(100)  # Cap chart data to prevent large payloads
    )
    score_rows = score_q.all()
    score_data = [{"name": r[0].split()[0], "avg": round(r[1], 0), "target": 75} for r in score_rows]

    return {
        "completionRate": completion_rate,
        "completedCount": completed,
        "totalEnrollments": total,
        "avgQuizScore": avg_quiz,
        "atRiskCount": len(at_risk),
        "atRisk": at_risk,
        "completionTrend": trend,
        "scoreByUser": score_data,
    }


# --- User Profile Update ---


async def update_user(db: AsyncSession, user_id: int, *,
                      full_name: str | None = None,
                      password: str | None = None) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if full_name is not None:
        user.full_name = full_name
    if password is not None:
        user.password = password
    await db.commit()
    await db.refresh(user)
    return user


# --- Search ---


async def search(db: AsyncSession, q: str) -> tuple[list[Course], list[User]]:
    pattern = f"%{q}%"
    course_q = await db.execute(
        select(Course).where(
            (Course.title.ilike(pattern)) | (Course.description.ilike(pattern))
        ).limit(10)
    )
    courses = list(course_q.scalars().all())

    user_q = await db.execute(
        select(User).where(User.full_name.ilike(pattern)).limit(10)
    )
    users = list(user_q.scalars().all())
    return courses, users


# --- Exam Papers ---


async def create_exam_paper(
    db: AsyncSession,
    course_id: int,
    questions: list,
    total_marks: int,
    generated_by: int,
) -> ExamPaper:
    existing = await get_exam_paper_by_course(db, course_id)
    if existing:
        await db.delete(existing)
        await db.flush()

    paper = ExamPaper(
        course_id=course_id,
        questions=questions,
        total_marks=total_marks,
        generated_by=generated_by,
    )
    db.add(paper)
    await db.commit()
    await db.refresh(paper)
    return paper


async def upsert_exam_paper_config(
    db: AsyncSession,
    exam_paper_id: int,
    *,
    blooms_distribution: dict | None = None,
    question_format: str = "mixed",
    notify_user_ids: list[int] | None = None,
    live_enabled: bool = False,
    live_duration_minutes: int = 30,
) -> ExamPaperConfig:
    result = await db.execute(
        select(ExamPaperConfig).where(ExamPaperConfig.exam_paper_id == exam_paper_id)
    )
    config = result.scalar_one_or_none()
    if config is None:
        config = ExamPaperConfig(
            exam_paper_id=exam_paper_id,
            blooms_distribution=blooms_distribution,
            question_format=question_format,
            notify_user_ids=notify_user_ids,
            live_enabled=live_enabled,
            live_duration_minutes=live_duration_minutes,
        )
        db.add(config)
    else:
        config.blooms_distribution = blooms_distribution
        config.question_format = question_format
        config.notify_user_ids = notify_user_ids
        config.live_enabled = live_enabled
        config.live_duration_minutes = live_duration_minutes
    await db.commit()
    await db.refresh(config)
    return config


async def get_exam_paper_config(db: AsyncSession, exam_paper_id: int) -> ExamPaperConfig | None:
    result = await db.execute(
        select(ExamPaperConfig).where(ExamPaperConfig.exam_paper_id == exam_paper_id)
    )
    return result.scalar_one_or_none()


async def get_exam_paper(db: AsyncSession, paper_id: int) -> ExamPaper | None:
    result = await db.execute(select(ExamPaper).where(ExamPaper.id == paper_id))
    return result.scalar_one_or_none()


async def get_exam_paper_by_course(db: AsyncSession, course_id: int) -> ExamPaper | None:
    result = await db.execute(select(ExamPaper).where(ExamPaper.course_id == course_id))
    return result.scalar_one_or_none()


async def delete_exam_paper(db: AsyncSession, paper_id: int) -> bool:
    paper = await get_exam_paper(db, paper_id)
    if not paper:
        return False
    await db.delete(paper)
    await db.commit()
    return True


# --- Exam Attempts ---


async def create_exam_attempt(
    db: AsyncSession,
    exam_paper_id: int,
    user_id: int,
    image_urls: list,
) -> ExamAttempt:
    attempt = ExamAttempt(
        exam_paper_id=exam_paper_id,
        user_id=user_id,
        image_urls=image_urls,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def get_exam_attempt(db: AsyncSession, attempt_id: int) -> ExamAttempt | None:
    result = await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    return result.scalar_one_or_none()


async def get_exam_attempt_by_user_and_paper(
    db: AsyncSession, user_id: int, exam_paper_id: int
) -> ExamAttempt | None:
    result = await db.execute(
        select(ExamAttempt).where(
            ExamAttempt.user_id == user_id,
            ExamAttempt.exam_paper_id == exam_paper_id,
        ).order_by(desc(ExamAttempt.submitted_at))
    )
    return result.scalar_one_or_none()


async def get_exam_attempts_by_user_and_paper(
    db: AsyncSession, user_id: int, exam_paper_id: int
) -> List[ExamAttempt]:
    result = await db.execute(
        select(ExamAttempt)
        .where(
            ExamAttempt.user_id == user_id,
            ExamAttempt.exam_paper_id == exam_paper_id,
        )
        .order_by(desc(ExamAttempt.submitted_at))
    )
    return list(result.scalars().all())


async def update_exam_attempt_score(
    db: AsyncSession,
    attempt_id: int,
    score: int | None,
    total_marks: int | None,
    evaluation_text: str | None,
) -> ExamAttempt | None:
    attempt = await get_exam_attempt(db, attempt_id)
    if not attempt:
        return None
    attempt.score = score
    attempt.total_marks = total_marks
    attempt.evaluation_text = evaluation_text
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def get_exam_attempts_for_paper(db: AsyncSession, exam_paper_id: int) -> List[ExamAttempt]:
    result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.exam_paper_id == exam_paper_id)
        .order_by(desc(ExamAttempt.submitted_at))
    )
    return list(result.scalars().all())


async def get_exam_attempts_for_user(db: AsyncSession, user_id: int) -> List[ExamAttempt]:
    result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.user_id == user_id)
        .order_by(desc(ExamAttempt.submitted_at))
    )
    return list(result.scalars().all())
