from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Course, CourseModule, Enrollment, Notification, SpeakingPractice, WorkflowAnalysis, AnalysisResult, LearnerProfile, TutorMessage


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
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        return None
    modules = await get_course_modules(db, course.id)
    creator = await get_user(db, course.created_by) if course.created_by else None
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


# --- Enrollments ---


async def get_enrollments(db: AsyncSession, user_id: int | None = None) -> List[dict]:
    stmt = select(Enrollment)
    if user_id is not None:
        stmt = stmt.where(Enrollment.user_id == user_id)
    result = await db.execute(stmt)
    enrollments = list(result.scalars().all())
    out = []
    for e in enrollments:
        course_data = await get_course(db, e.course_id) if e.course_id else None
        user = await get_user(db, e.user_id) if e.user_id else None
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
                                   feedback: str | None = None,
                                   corrections: str | None = None) -> SpeakingPractice:
    practice = SpeakingPractice(
        user_id=user_id, prompt=prompt, transcript=transcript, audio_url=audio_url,
        pronunciation_score=pronunciation_score, fluency_score=fluency_score,
        feedback=feedback, corrections=corrections,
    )
    db.add(practice)
    await db.commit()
    await db.refresh(practice)
    return practice


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
