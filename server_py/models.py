from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, Text, Boolean, DateTime, Float, ARRAY, ForeignKey, func, JSON, UniqueConstraint, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default="employee")
    preferred_language: Mapped[Optional[str]] = mapped_column(Text, nullable=True, server_default="en")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft")
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    objectives: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    audience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    depth: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generation_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generation_progress: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class CourseModule(Base):
    __tablename__ = "course_modules"
    __table_args__ = (
        Index('idx_course_modules_course_id', 'course_id'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("courses.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    quiz: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    images: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)


class CourseConceptGraph(Base):
    __tablename__ = "course_concept_graphs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False, unique=True)
    mermaid: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="ready")
    nodes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    edges: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint('user_id', 'course_id', name='uix_user_course'),
        Index('idx_enrollments_status', 'status'),
        Index('idx_enrollments_user', 'user_id'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    course_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("courses.id"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="assigned")
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index('idx_notifications_user_id', 'user_id'),
        Index('idx_notifications_user_unread', 'user_id', 'is_read'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[Optional[bool]] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class SpeakingTopic(Base):
    __tablename__ = "speaking_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class SpeakingLesson(Base):
    __tablename__ = "speaking_lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("speaking_topics.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty_level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    prompt_template_en: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_template_hi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prompt_template_mr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_vocabulary: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    example_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class UserLessonProgress(Base):
    __tablename__ = "user_lesson_progress"
    __table_args__ = (
        Index('idx_lesson_progress_user_lesson', 'user_id', 'lesson_id'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("speaking_lessons.id"), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    best_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    last_practiced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SpeakingPractice(Base):
    __tablename__ = "speaking_practices"
    __table_args__ = (
        Index('idx_speaking_practices_user_created', 'user_id', 'created_at'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("speaking_lessons.id"), nullable=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pronunciation_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fluency_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vocabulary_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grammar_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrections: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class WorkflowAnalysis(Base):
    __tablename__ = "workflow_analyses"
    __table_args__ = (
        Index('idx_workflow_analyses_user_created', 'created_by', 'created_at'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="processing")
    column_mapping: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    total_employees: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    __table_args__ = (
        Index('idx_analysis_results_analysis_id', 'analysis_id'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(Integer, ForeignKey("workflow_analyses.id"), nullable=False)
    employee_name: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_skills: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    matched_course_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    suggested_trainings: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class AppSession(Base):
    __tablename__ = "app_sessions"

    sid: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    knowledge_level: Mapped[str] = mapped_column(Text, nullable=False, server_default="beginner")
    avg_quiz_score: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    total_modules_completed: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    struggle_topics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    strong_topics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    preferred_pace: Mapped[str] = mapped_column(Text, nullable=False, server_default="normal")
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    __table_args__ = (
        Index('idx_tutor_messages_user_course_created', 'user_id', 'course_id', 'created_at'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False)
    module_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("course_modules.id"), nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        Index('idx_assessments_user_module', 'user_id', 'module_id'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("course_modules.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    answers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class AudioUpload(Base):
    __tablename__ = "audio_uploads"
    __table_args__ = (
        Index('idx_audio_uploads_user_created', 'user_id', 'created_at'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mindmap_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="uploading")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ExamPaper(Base):
    __tablename__ = "exam_papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False, unique=True)
    generated_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    questions: Mapped[list] = mapped_column(JSON, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class ExamPaperConfig(Base):
    __tablename__ = "exam_paper_configs"
    __table_args__ = (
        Index("idx_exam_paper_configs_paper", "exam_paper_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_paper_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("exam_papers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    blooms_distribution: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    question_format: Mapped[str] = mapped_column(Text, nullable=False, server_default="mixed")
    notify_user_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    live_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    live_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_paper_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_papers.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_urls: Mapped[list] = mapped_column(JSON, nullable=False)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_marks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evaluation_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
