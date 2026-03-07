from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# --- Response models ---


class UserOut(CamelModel):
    id: int
    email: str
    password: str
    full_name: str
    role: str
    created_at: Optional[datetime] = None


class CourseOut(CamelModel):
    id: int
    title: str
    description: str
    status: str
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    objectives: Optional[List[str]] = None
    audience: Optional[str] = None
    depth: Optional[str] = None
    generation_status: Optional[str] = None
    generation_progress: Optional[str] = None


class CourseModuleOut(CamelModel):
    id: int
    course_id: Optional[int] = None
    title: str
    content: str
    sort_order: int
    quiz: Optional[str] = None
    audio_url: Optional[str] = None
    images: Optional[List[str]] = None


class CourseDetailOut(CourseOut):
    modules: Optional[List[CourseModuleOut]] = None
    creator: Optional[UserOut] = None


class CourseListOut(CourseOut):
    creator: Optional[UserOut] = None


class EnrollmentOut(CamelModel):
    id: int
    user_id: Optional[int] = None
    course_id: Optional[int] = None
    status: str
    progress_pct: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class EnrollmentDetailOut(EnrollmentOut):
    course: Optional[CourseDetailOut] = None
    user: Optional[UserOut] = None


class NotificationOut(CamelModel):
    id: int
    user_id: Optional[int] = None
    title: str
    message: str
    is_read: Optional[bool] = None
    created_at: Optional[datetime] = None


class SpeakingPracticeOut(CamelModel):
    id: int
    user_id: Optional[int] = None
    prompt: str
    transcript: Optional[str] = None
    audio_url: Optional[str] = None
    pronunciation_score: Optional[float] = None
    fluency_score: Optional[float] = None
    feedback: Optional[str] = None
    corrections: Optional[str] = None
    created_at: Optional[datetime] = None


# --- Input models ---


class LoginInput(CamelModel):
    email: str
    password: str


class RegisterInput(CamelModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"


class CreateCourse(CamelModel):
    title: str
    description: str
    status: str = "draft"
    created_by: Optional[int] = None
    objectives: Optional[List[str]] = None
    audience: Optional[str] = None
    depth: Optional[str] = None


class CreateModule(CamelModel):
    title: str
    content: str
    sort_order: int = 0
    quiz: Optional[str] = None


class GenerateCourseInput(CamelModel):
    title: str
    audience: str = "all"
    depth: str = "intermediate"


class CreateEnrollment(CamelModel):
    user_id: int
    course_id: int
    status: str = "assigned"
    progress_pct: int = 0


class UpdateProgress(CamelModel):
    progress_pct: int
    status: Optional[str] = None


class CreateSpeakingPractice(CamelModel):
    prompt: str
    transcript: Optional[str] = None
    audio_url: Optional[str] = None
    pronunciation_score: Optional[float] = None
    fluency_score: Optional[float] = None
    feedback: Optional[str] = None
    corrections: Optional[str] = None


class ErrorResponse(BaseModel):
    message: str
    field: Optional[str] = None

    def model_dump_json(self, **kwargs):
        kwargs.setdefault("exclude_none", True)
        return super().model_dump_json(**kwargs)

    def model_dump(self, **kwargs):
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(**kwargs)


class MessageResponse(CamelModel):
    message: str


# --- Analysis models ---


class SuggestedTraining(CamelModel):
    title: str
    description: str
    reason: str


class AnalysisResultOut(CamelModel):
    id: int
    analysis_id: int
    employee_name: str
    department: Optional[str] = None
    manager_remarks: Optional[str] = None
    ai_summary: Optional[str] = None
    recommended_skills: Optional[List[str]] = None
    matched_course_ids: Optional[List[int]] = None
    suggested_trainings: Optional[List[SuggestedTraining]] = None
    created_at: Optional[datetime] = None


class AnalysisOut(CamelModel):
    id: int
    created_by: Optional[int] = None
    filename: str
    status: str
    column_mapping: Optional[dict] = None
    total_employees: int
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AnalysisDetailOut(AnalysisOut):
    results: Optional[List[AnalysisResultOut]] = None


# --- Tutor models ---


class TutorMessageOut(CamelModel):
    id: int
    user_id: int
    course_id: int
    module_id: Optional[int] = None
    role: str
    content: str
    audio_url: Optional[str] = None
    created_at: Optional[datetime] = None


class TutorChatInput(CamelModel):
    message: str
    module_id: int
    course_id: int


class LearnerProfileOut(CamelModel):
    id: int
    user_id: int
    knowledge_level: str
    avg_quiz_score: float
    total_modules_completed: int
    struggle_topics: Optional[List[str]] = None
    strong_topics: Optional[List[str]] = None
    preferred_pace: str
    updated_at: Optional[datetime] = None


class UpdateLearnerProfile(CamelModel):
    quiz_score: float
    module_title: str
