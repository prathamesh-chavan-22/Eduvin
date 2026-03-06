import asyncio
import csv
import io
import logging

from fastapi import APIRouter, Depends, Response, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, async_session_factory
from dependencies import require_auth
from schemas import AnalysisOut, AnalysisDetailOut, AnalysisResultOut, ErrorResponse
import storage
from services.mistral_ai import detect_csv_columns, analyze_remarks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


async def _process_analysis(analysis_id: int, rows: list[dict], headers: list[str], user_id: int):
    async with async_session_factory() as db:
        try:
            # Step 1: Detect columns using AI
            sample_rows = [list(row.values()) for row in rows[:3]]
            column_mapping = await detect_csv_columns(headers, sample_rows)

            await storage.update_analysis_status(
                db, analysis_id, status="processing",
                column_mapping=column_mapping, total_employees=len(rows),
            )

            # Determine which columns to use
            name_col = column_mapping.get("employee_name", "")
            dept_col = column_mapping.get("department", "")
            remarks_col = column_mapping.get("manager_remarks", "")

            if not name_col or not remarks_col:
                await storage.update_analysis_status(db, analysis_id, status="failed")
                return

            # Get existing courses for matching
            course_data = await storage.get_courses(db)
            existing_courses = [
                {"id": c["course"].id, "title": c["course"].title, "description": c["course"].description}
                for c in course_data
            ]

            # Step 2: Analyze each employee's remarks
            async def process_employee(row: dict):
                emp_name = row.get(name_col, "Unknown")
                department = row.get(dept_col, None)
                remarks = row.get(remarks_col, "")

                if not remarks.strip():
                    await storage.create_analysis_result(
                        db, analysis_id=analysis_id, employee_name=emp_name,
                        department=department, manager_remarks=remarks,
                        ai_summary="No remarks provided.",
                    )
                    return

                ai_result = await analyze_remarks(emp_name, department, remarks, existing_courses)

                await storage.create_analysis_result(
                    db, analysis_id=analysis_id, employee_name=emp_name,
                    department=department, manager_remarks=remarks,
                    ai_summary=ai_result["summary"],
                    recommended_skills=ai_result["recommended_skills"],
                    matched_course_ids=ai_result["matched_courses"],
                    suggested_trainings=ai_result["suggested_trainings"],
                )

            # Process with concurrency limit (handled by semaphore in mistral_ai)
            tasks = [process_employee(row) for row in rows]
            await asyncio.gather(*tasks)

            await storage.update_analysis_status(
                db, analysis_id, status="completed", total_employees=len(rows),
            )

        except Exception:
            logger.exception("Analysis processing failed for analysis_id=%s", analysis_id)
            async with async_session_factory() as err_db:
                await storage.update_analysis_status(err_db, analysis_id, status="failed")


@router.post("/upload", status_code=201)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    if not file.filename or not file.filename.endswith(".csv"):
        return Response(
            content=ErrorResponse(message="Only CSV files are supported").model_dump_json(),
            status_code=400,
            media_type="application/json",
        )

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    rows = list(reader)

    if not rows:
        return Response(
            content=ErrorResponse(message="CSV file is empty").model_dump_json(),
            status_code=400,
            media_type="application/json",
        )

    analysis = await storage.create_analysis(
        db, created_by=user_id, filename=file.filename,
        total_employees=len(rows),
    )

    background_tasks.add_task(_process_analysis, analysis.id, rows, headers, user_id)

    return AnalysisOut.model_validate(analysis).model_dump(by_alias=True)


@router.get("")
async def list_analyses(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    analyses = await storage.get_analyses(db, user_id)
    return [AnalysisOut.model_validate(a).model_dump(by_alias=True) for a in analyses]


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    data = await storage.get_analysis(db, analysis_id)
    if data is None:
        return Response(
            content=ErrorResponse(message="Analysis not found").model_dump_json(),
            status_code=404,
            media_type="application/json",
        )

    analysis = data["analysis"]
    if analysis.created_by != user_id:
        return Response(
            content=ErrorResponse(message="Not authorized").model_dump_json(),
            status_code=403,
            media_type="application/json",
        )

    result = AnalysisDetailOut.model_validate(analysis).model_dump(by_alias=True)
    result["results"] = [
        AnalysisResultOut.model_validate(r).model_dump(by_alias=True)
        for r in data["results"]
    ]
    return result
