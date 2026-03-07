from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    EnrollmentOut, EnrollmentDetailOut, CreateEnrollment, UpdateProgress,
    ErrorResponse, CourseDetailOut, CourseModuleOut, UserOut,
)
import storage

router = APIRouter(prefix="/api/enrollments", tags=["enrollments"])


def _build_enrollment_detail(item: dict) -> dict:
    e = item["enrollment"]
    result = EnrollmentDetailOut.model_validate(e).model_dump(by_alias=True)

    if item["course"]:
        cd = item["course"]
        c = cd["course"]
        course_dict = CourseDetailOut.model_validate(c).model_dump(by_alias=True)
        course_dict["modules"] = [
            CourseModuleOut.model_validate(m).model_dump(by_alias=True)
            for m in cd.get("modules", [])
        ] if cd.get("modules") else None
        if cd.get("creator"):
            course_dict["creator"] = UserOut.model_validate(cd["creator"]).model_dump(by_alias=True)
        else:
            course_dict["creator"] = None
        result["course"] = course_dict
    else:
        result["course"] = None

    if item["user"]:
        result["user"] = UserOut.model_validate(item["user"]).model_dump(by_alias=True)
    else:
        result["user"] = None

    return result


@router.get("")
async def list_enrollments(userId: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    enrollments = await storage.get_enrollments(db, user_id=userId)
    return [_build_enrollment_detail(item) for item in enrollments]


@router.post("", status_code=201)
async def create_enrollment(body: CreateEnrollment, db: AsyncSession = Depends(get_db)):
    # Check if enrollment already exists
    from sqlalchemy import select
    from models import Enrollment
    
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == body.user_id,
            Enrollment.course_id == body.course_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Return existing enrollment without creating duplicate or sending notification
        return EnrollmentOut.model_validate(existing).model_dump(by_alias=True)
    
    enrollment = await storage.create_enrollment(
        db, user_id=body.user_id, course_id=body.course_id,
        status=body.status, progress_pct=body.progress_pct,
    )
    # Fire notification for the assigned user
    course_data = await storage.get_course(db, body.course_id)
    if course_data:
        course_title = course_data["course"].title
        await storage.create_notification(
            db, user_id=body.user_id,
            title="Course Assigned",
            message=f"You've been assigned \"{course_title}\". Start learning now!",
        )
    return EnrollmentOut.model_validate(enrollment).model_dump(by_alias=True)


@router.patch("/{enrollment_id}/progress")
async def update_progress(enrollment_id: int, body: UpdateProgress, db: AsyncSession = Depends(get_db)):
    enrollment = await storage.update_enrollment_progress(
        db, enrollment_id, progress_pct=body.progress_pct, status=body.status,
    )
    if enrollment is None:
        return Response(
            content=ErrorResponse(message="Enrollment not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )
    # Notify on completion
    if body.progress_pct == 100 or body.status == "completed":
        course_data = await storage.get_course(db, enrollment.course_id)
        if course_data:
            course_title = course_data["course"].title
            await storage.create_notification(
                db, user_id=enrollment.user_id,
                title="Course Completed 🎉",
                message=f"Congratulations! You have completed \"{course_title}\".",
            )
    return EnrollmentOut.model_validate(enrollment).model_dump(by_alias=True)
