import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth, require_auth_with_role
import storage
from services.mistral_exam_service import (
    generate_exam_paper,
    evaluate_attempt,
    score_live_exam_answers,
    sanitize_questions_for_live_exam,
)
from services.pdf_service import render_exam_paper_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/exam-papers", tags=["exam-papers"])

UPLOAD_DIR = Path(__file__).parent.parent / "static" / "exam-uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _is_admin(role: str) -> bool:
    return role == "l_and_d"


async def _serialize_paper(db: AsyncSession, paper) -> dict:
    config = await storage.get_exam_paper_config(db, paper.id)
    return {
        "id": paper.id,
        "courseId": paper.course_id,
        "questions": paper.questions,
        "totalMarks": paper.total_marks,
        "createdAt": paper.created_at.isoformat() if paper.created_at else None,
        "bloomsDistribution": config.blooms_distribution if config else None,
        "questionFormat": config.question_format if config else "mixed",
        "liveEnabled": bool(config.live_enabled) if config else False,
        "liveDurationMinutes": int(config.live_duration_minutes) if config else 30,
        "notifyUserIds": config.notify_user_ids if config and config.notify_user_ids else [],
    }


async def _notify_selected_users(
    db: AsyncSession,
    *,
    paper_id: int,
    submitted_by: int,
    score: int | None,
    total_marks: int | None,
    mode: str,
):
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        return
    config = await storage.get_exam_paper_config(db, paper_id)
    if not config or not config.notify_user_ids:
        return
    user = await storage.get_user(db, submitted_by)
    user_name = user.full_name if user else f"User #{submitted_by}"
    course_data = await storage.get_course(db, paper.course_id)
    course_title = course_data["course"].title if course_data else f"Course #{paper.course_id}"
    score_text = (
        f"{score}/{total_marks}" if score is not None and total_marks is not None else "pending evaluation"
    )

    for recipient_id in config.notify_user_ids:
        if not isinstance(recipient_id, int) or recipient_id == submitted_by:
            continue
        await storage.create_notification(
            db,
            user_id=recipient_id,
            title="Exam Submission Alert",
            message=(
                f"{user_name} submitted a {mode} exam attempt for \"{course_title}\". "
                f"Current score: {score_text}."
            ),
        )


@router.post("/generate/{course_id}")
async def generate_paper(
    course_id: int,
    body: dict | None = Body(default=None),
    auth: tuple[int, str] = Depends(require_auth_with_role),
    db: AsyncSession = Depends(get_db),
):
    user_id, user_role = auth
    if user_role != "l_and_d":
        raise HTTPException(status_code=403, detail="L&D Admin only")

    course_data = await storage.get_course(db, course_id)
    if not course_data:
        raise HTTPException(status_code=404, detail="Course not found")

    course = course_data["course"]
    modules = course_data.get("modules", [])

    if not modules:
        raise HTTPException(status_code=400, detail="Course has no modules")

    payload = body or {}
    question_count = int(payload.get("questionCount", 10) or 10)
    question_format = str(payload.get("questionFormat", "mixed") or "mixed").strip().lower()
    raw_blooms = payload.get("bloomsDistribution")
    blooms_distribution = raw_blooms if isinstance(raw_blooms, dict) else None
    notify_user_ids = payload.get("notifyUserIds", [])
    if not isinstance(notify_user_ids, list):
        notify_user_ids = []
    sanitized_notify_user_ids = []
    for value in notify_user_ids:
        try:
            user_value = int(value)
            if user_value not in sanitized_notify_user_ids:
                sanitized_notify_user_ids.append(user_value)
        except (TypeError, ValueError):
            continue

    live_enabled = bool(payload.get("liveEnabled", False))
    live_duration_minutes = int(payload.get("liveDurationMinutes", 30) or 30)
    if live_duration_minutes < 5:
        live_duration_minutes = 5
    if live_duration_minutes > 180:
        live_duration_minutes = 180

    try:
        result = await generate_exam_paper(
            course_title=course.title,
            objectives=course.objectives,
            modules=[{"title": m.title, "content": m.content} for m in modules],
            question_count=question_count,
            blooms_distribution=blooms_distribution,
            question_format=question_format,
        )
    except Exception as e:
        logger.error(f"Paper generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    paper = await storage.create_exam_paper(
        db,
        course_id=course_id,
        questions=result["questions"],
        total_marks=result["total_marks"],
        generated_by=user_id,
    )
    await storage.upsert_exam_paper_config(
        db,
        exam_paper_id=paper.id,
        blooms_distribution=result.get("blooms_distribution"),
        question_format=result.get("question_format", question_format),
        notify_user_ids=sanitized_notify_user_ids,
        live_enabled=live_enabled,
        live_duration_minutes=live_duration_minutes,
    )
    return await _serialize_paper(db, paper)


@router.get("/by-course/{course_id}")
async def get_paper_by_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    paper = await storage.get_exam_paper_by_course(db, course_id)
    if not paper:
        raise HTTPException(status_code=404, detail="No exam paper for this course")

    return await _serialize_paper(db, paper)


@router.get("/{paper_id}")
async def get_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    auth: tuple[int, str] = Depends(require_auth_with_role),
):
    user_id, user_role = auth
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    # Allow admin (l_and_d) and manager roles to bypass enrollment check
    if user_role not in ["l_and_d", "manager"]:
        # Verify user is enrolled in the course for regular employees
        from sqlalchemy import select
        from models import Enrollment
        enrollment_result = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == user_id,
                Enrollment.course_id == paper.course_id
            )
        )
        enrollment = enrollment_result.scalar_one_or_none()
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    return await _serialize_paper(db, paper)


@router.get("/{paper_id}/pdf")
async def download_pdf(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    auth: tuple[int, str] = Depends(require_auth_with_role),
):
    user_id, user_role = auth
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    # Allow admin (l_and_d) and manager roles to bypass enrollment check
    if user_role not in ["l_and_d", "manager"]:
        # Verify user is enrolled in the course for regular employees
        from sqlalchemy import select
        from models import Enrollment
        enrollment_result = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == user_id,
                Enrollment.course_id == paper.course_id
            )
        )
        enrollment = enrollment_result.scalar_one_or_none()
        
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    course_data = await storage.get_course(db, paper.course_id)
    course_title = course_data["course"].title if course_data else "Exam Paper"

    try:
        pdf_bytes = render_exam_paper_pdf(
            course_title=course_title,
            questions=paper.questions,
            total_marks=paper.total_marks,
        )
    except RuntimeError as e:
        logger.error(f"PDF generation unavailable: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    temp_path = UPLOAD_DIR / f"exam_{paper_id}.pdf"
    with open(temp_path, "wb") as f:
        f.write(pdf_bytes)

    return FileResponse(
        path=str(temp_path),
        media_type="application/pdf",
        filename=f"exam_{course_title.replace(' ', '_')}.pdf",
    )


@router.post("/{paper_id}/upload")
async def upload_attempt(
    paper_id: int,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images per upload")

    attempt_dir = UPLOAD_DIR / str(paper_id) / str(user_id) / str(uuid.uuid4())
    attempt_dir.mkdir(parents=True, exist_ok=True)

    image_paths = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File must be an image: {f.filename}")
        file_bytes = await f.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Image too large: {f.filename}")

        ext = Path(f.filename or "upload.jpg").suffix or ".jpg"
        file_path = attempt_dir / f"page_{len(image_paths)}{ext}"
        with open(file_path, "wb") as out:
            out.write(file_bytes)
        image_paths.append(str(file_path))

    attempt = await storage.create_exam_attempt(
        db,
        exam_paper_id=paper_id,
        user_id=user_id,
        image_urls=[str(Path(p).relative_to(UPLOAD_DIR)) for p in image_paths],
    )

    try:
        result = await evaluate_attempt(
            image_paths=image_paths,
            questions=paper.questions,
            total_marks=paper.total_marks,
        )
    except Exception as e:
        logger.error(f"Evaluation failed for attempt {attempt.id}: {e}")
        err_text = str(e)
        failure_summary = (
            "Evaluation delayed due to AI rate limit (429). Please retry in a few minutes."
            if "429" in err_text
            else "Evaluation failed — please try again later."
        )
        await storage.update_exam_attempt_score(
            db,
            attempt_id=attempt.id,
            score=None,
            total_marks=paper.total_marks,
            evaluation_text=failure_summary,
        )
        await _notify_selected_users(
            db,
            paper_id=paper_id,
            submitted_by=user_id,
            score=None,
            total_marks=paper.total_marks,
            mode="handwritten",
        )
        return {
            "id": attempt.id,
            "score": None,
            "totalMarks": paper.total_marks,
            "summary": failure_summary,
            "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        }

    await storage.update_exam_attempt_score(
        db,
        attempt_id=attempt.id,
        score=result["score"],
        total_marks=result["total_marks"],
        evaluation_text=result["summary"],
    )
    await _notify_selected_users(
        db,
        paper_id=paper_id,
        submitted_by=user_id,
        score=result["score"],
        total_marks=result["total_marks"],
        mode="handwritten",
    )

    return {
        "id": attempt.id,
        "score": result["score"],
        "totalMarks": result["total_marks"],
        "summary": result["summary"],
        "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }


@router.post("/{paper_id}/live/start")
async def start_live_exam(
    paper_id: int,
    auth: tuple[int, str] = Depends(require_auth_with_role),
    db: AsyncSession = Depends(get_db),
):
    user_id, user_role = auth
    if user_role == "l_and_d":
        raise HTTPException(status_code=403, detail="L&D Admin cannot take live exams")

    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")
    config = await storage.get_exam_paper_config(db, paper_id)
    if not config or not config.live_enabled:
        raise HTTPException(status_code=400, detail="Live exam is not enabled for this paper")

    return {
        "paperId": paper.id,
        "durationMinutes": int(config.live_duration_minutes),
        "questions": sanitize_questions_for_live_exam(paper.questions),
        "startedBy": user_id,
    }


@router.post("/{paper_id}/live/submit")
async def submit_live_exam(
    paper_id: int,
    body: dict | None = Body(default=None),
    auth: tuple[int, str] = Depends(require_auth_with_role),
    db: AsyncSession = Depends(get_db),
):
    user_id, user_role = auth
    if user_role == "l_and_d":
        raise HTTPException(status_code=403, detail="L&D Admin cannot submit live exams")

    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")
    config = await storage.get_exam_paper_config(db, paper_id)
    if not config or not config.live_enabled:
        raise HTTPException(status_code=400, detail="Live exam is not enabled for this paper")

    payload = body or {}
    answers = payload.get("answers", [])
    if not isinstance(answers, list):
        raise HTTPException(status_code=400, detail="answers must be a list")

    grading = score_live_exam_answers(paper.questions, answers)
    attempt = await storage.create_exam_attempt(
        db,
        exam_paper_id=paper_id,
        user_id=user_id,
        image_urls=[],
    )
    await storage.update_exam_attempt_score(
        db,
        attempt_id=attempt.id,
        score=grading["score"],
        total_marks=grading["total_marks"],
        evaluation_text=grading["summary"],
    )
    await _notify_selected_users(
        db,
        paper_id=paper_id,
        submitted_by=user_id,
        score=grading["score"],
        total_marks=grading["total_marks"],
        mode="live",
    )

    return {
        "id": attempt.id,
        "score": grading["score"],
        "totalMarks": grading["total_marks"],
        "summary": grading["summary"],
        "correctAnswers": grading["correct_answers"],
        "autoGradedQuestions": grading["auto_graded_questions"],
        "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }


@router.get("/{paper_id}/results")
async def get_results(
    paper_id: int,
    auth: tuple[int, str] = Depends(require_auth_with_role),
    db: AsyncSession = Depends(get_db),
):
    user_id, user_role = auth
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    if _is_admin(user_role):
        attempts = await storage.get_exam_attempts_for_paper(db, paper_id)
    else:
        attempts = await storage.get_exam_attempts_by_user_and_paper(db, user_id, paper_id)

    result = []
    for a in attempts:
        result.append({
            "id": a.id,
            "userId": a.user_id,
            "score": a.score,
            "totalMarks": a.total_marks,
            "evaluationText": a.evaluation_text,
            "imageUrls": a.image_urls,
            "submittedAt": a.submitted_at.isoformat() if a.submitted_at else None,
        })

    return {"paperId": paper_id, "attempts": result}


@router.delete("/{paper_id}")
async def delete_paper(
    paper_id: int,
    auth: tuple[int, str] = Depends(require_auth_with_role),
    db: AsyncSession = Depends(get_db),
):
    user_id, user_role = auth
    if user_role != "l_and_d":
        raise HTTPException(status_code=403, detail="L&D Admin only")

    success = await storage.delete_exam_paper(db, paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    return {"message": "Exam paper deleted"}
