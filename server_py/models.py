from datetime import datetime
from typing import Optional, List

from sqlalchemy import Integer, Text, Boolean, DateTime, Float, ARRAY, ForeignKey, func, JSON
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("courses.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    quiz: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    images: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    course_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("courses.id"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="assigned")
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[Optional[bool]] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class SpeakingPractice(Base):
    __tablename__ = "speaking_practices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pronunciation_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fluency_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrections: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class WorkflowAnalysis(Base):
    __tablename__ = "workflow_analyses"

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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False)
    module_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("course_modules.id"), nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
