import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, async_session_factory
from dependencies import require_auth
from schemas import (
    CourseListOut, CourseDetailOut, CourseOut, CourseModuleOut,
    CreateCourse, CreateModule, GenerateCourseInput, ErrorResponse, CourseConceptGraphOut,
)
import storage
from services.mistral_ai import generate_course_outline, generate_chapter_content, generate_course_concept_graph
from services.edge_tts_service import generate_audio

logger = logging.getLogger(__name__)


def module_to_out(module) -> dict:
    """Serialize a module ORM object."""
    return CourseModuleOut.model_validate(module).model_dump(by_alias=True)

router = APIRouter(prefix="/api/courses", tags=["courses"])


# ───────────────────────── Background pipeline ─────────────────────────

async def _generate_course_pipeline(course_id: int, title: str, audience: str, depth: str):
    """Full AI generation pipeline: outline → content → audio."""
    async with async_session_factory() as db:
        try:
            # Step 1: Generate outline via Mistral
            await storage.update_course_generation_status(
                db, course_id, "generating_outline",
                json.dumps({"step": "Generating course outline...", "pct": 5}),
            )

            outline = await generate_course_outline(title, audience, depth)

            # Update course with refined title/description/objectives
            await storage.update_course_details(
                db, course_id,
                title=outline.get("title", title),
                description=outline.get("description", "AI-generated course"),
                objectives=outline.get("objectives", []),
            )

            chapters = outline.get("chapters", [])
            total_chapters = len(chapters)

            if total_chapters == 0:
                await storage.update_course_generation_status(db, course_id, "failed",
                    json.dumps({"step": "No chapters generated", "pct": 0}))
                return

            # Step 2: Generate content for each chapter
            module_ids: list[int] = []
            tts_scripts: list[str] = []

            for i, chapter in enumerate(chapters, 1):
                pct = int(10 + (i / total_chapters) * 55)
                await storage.update_course_generation_status(
                    db, course_id, "generating_content",
                    json.dumps({"step": f"Generating chapter {i}/{total_chapters}: {chapter['title']}", "pct": pct}),
                )

                # Generate content
                chapter_data = await generate_chapter_content(
                    outline.get("title", title),
                    chapter["title"],
                    chapter.get("summary", ""),
                    audience,
                    depth,
                )

                # Insert images into markdown content if we got any
                content = chapter_data.get("content", "")

                # Save module
                quiz_json = json.dumps(chapter_data.get("quiz", {})) if chapter_data.get("quiz") else None
                module = await storage.create_course_module(
                    db,
                    course_id=course_id,
                    title=chapter["title"],
                    content=content,
                    sort_order=i,
                    quiz=quiz_json,
                    images=[],
                )
                module_ids.append(module.id)
                tts_scripts.append(chapter_data.get("tts_script", ""))

            # Step 3: Generate audio for each chapter
            for i, (mod_id, script) in enumerate(zip(module_ids, tts_scripts), 1):
                if not script or not script.strip():
                    continue

                pct = int(65 + (i / len(module_ids)) * 30)
                await storage.update_course_generation_status(
                    db, course_id, "generating_audio",
                    json.dumps({"step": f"Generating audio {i}/{len(module_ids)}", "pct": pct}),
                )

                try:
                    filename = f"course_{course_id}_module_{mod_id}.mp3"
                    audio_url = await generate_audio(script, filename)
                    await storage.update_module_audio(db, mod_id, audio_url)
                except Exception as e:
                    logger.warning(f"Audio generation failed for module {mod_id}: {e}")
                    # Continue - audio is optional

            # Step 4: Mark completed
            await storage.update_course_generation_status(
                db, course_id, "generating_graph",
                json.dumps({"step": "Building concept graph...", "pct": 95}),
            )

            fresh_course = await storage.get_course(db, course_id)
            if fresh_course is not None:
                course_entity = fresh_course["course"]
                modules_for_graph = [
                    {"title": m.title, "content": m.content}
                    for m in fresh_course["modules"]
                ]
                concept_graph = await generate_course_concept_graph(
                    course_title=course_entity.title,
                    course_description=course_entity.description,
                    modules=modules_for_graph,
                )
                await storage.upsert_course_concept_graph(
                    db,
                    course_id=course_id,
                    mermaid=concept_graph["mermaid"],
                    status=concept_graph.get("status", "ready"),
                    nodes=concept_graph.get("nodes", []),
                    edges=concept_graph.get("edges", []),
                )

            # Step 5: Mark completed
            await storage.update_course_generation_status(
                db, course_id, "completed",
                json.dumps({"step": "Course generation complete!", "pct": 100}),
            )

        except Exception:
            logger.exception("Course generation failed for course_id=%s", course_id)
            async with async_session_factory() as err_db:
                await storage.update_course_generation_status(
                    err_db, course_id, "failed",
                    json.dumps({"step": "Generation failed. Please try again.", "pct": 0}),
                )


async def _regenerate_concept_graph_pipeline(course_id: int):
    """Regenerate a detailed concept graph for an existing course in background."""
    async with async_session_factory() as db:
        try:
            course_data = await storage.get_course(db, course_id)
            if course_data is None:
                return

            existing = await storage.get_course_concept_graph(db, course_id)
            current_mermaid = existing.mermaid if existing is not None else ""

            await storage.upsert_course_concept_graph(
                db,
                course_id=course_id,
                mermaid=current_mermaid,
                status="generating",
                nodes=[],
                edges=[],
            )

            course_entity = course_data["course"]
            modules_for_graph = [
                {"title": m.title, "content": m.content}
                for m in course_data["modules"]
            ]
            concept_graph = await generate_course_concept_graph(
                course_title=course_entity.title,
                course_description=course_entity.description,
                modules=modules_for_graph,
            )

            await storage.upsert_course_concept_graph(
                db,
                course_id=course_id,
                mermaid=concept_graph["mermaid"],
                status=concept_graph.get("status", "ready"),
                nodes=concept_graph.get("nodes", []),
                edges=concept_graph.get("edges", []),
            )
        except Exception:
            logger.exception("Concept graph regeneration failed for course_id=%s", course_id)
            async with async_session_factory() as err_db:
                existing = await storage.get_course_concept_graph(err_db, course_id)
                current_mermaid = existing.mermaid if existing is not None else ""
                await storage.upsert_course_concept_graph(
                    err_db,
                    course_id=course_id,
                    mermaid=current_mermaid,
                    status="failed",
                    nodes=[],
                    edges=[],
                )


# ───────────────────────── Endpoints ─────────────────────────

@router.get("")
async def list_courses(db: AsyncSession = Depends(get_db)):
    courses = await storage.get_courses(db)
    result = []
    for item in courses:
        c = item["course"]
        data = CourseListOut.model_validate(c).model_dump(by_alias=True)
        if item["creator"]:
            from schemas import UserOut
            data["creator"] = UserOut.model_validate(item["creator"]).model_dump(by_alias=True)
        else:
            data["creator"] = None
        result.append(data)
    return result


@router.post("", status_code=201)
async def create_course(
    body: CreateCourse,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    course = await storage.create_course(
        db, title=body.title, description=body.description, status=body.status,
        created_by=user_id, objectives=body.objectives,
        audience=body.audience, depth=body.depth,
    )
    return CourseOut.model_validate(course).model_dump(by_alias=True)


@router.post("/generate", status_code=201)
async def generate_course(
    body: GenerateCourseInput,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a course and kick off AI generation in the background."""
    course = await storage.create_course(
        db,
        title=body.title,
        description="Generating...",
        status="draft",
        created_by=user_id,
        audience=body.audience,
        depth=body.depth,
    )
    await storage.update_course_generation_status(
        db, course.id, "generating_outline",
        json.dumps({"step": "Starting course generation...", "pct": 0}),
    )

    background_tasks.add_task(
        _generate_course_pipeline, course.id, body.title, body.audience, body.depth,
    )

    return CourseOut.model_validate(course).model_dump(by_alias=True)


@router.get("/image-proxy")
async def image_proxy(url: str):
    """Proxy external images — redirect directly to source URL."""
    from fastapi.responses import RedirectResponse
    if not url.startswith("http"):
        return Response(content='{"message":"Invalid URL"}', status_code=400, media_type="application/json")
    return RedirectResponse(url=url, status_code=302)


@router.get("/search")
async def search_courses(q: str = "", db: AsyncSession = Depends(get_db)):
    """Search courses by title/description and users by name."""
    if len(q.strip()) < 2:
        return {"courses": [], "users": []}
    courses, users = await storage.search(db, q.strip())
    from schemas import CourseOut, UserOut
    return {
        "courses": [CourseOut.model_validate(c).model_dump(by_alias=True) for c in courses],
        "users": [UserOut.model_validate(u).model_dump(by_alias=True) for u in users],
    }


@router.get("/{course_id}")
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    data = await storage.get_course(db, course_id)
    if data is None:
        return Response(
            content=ErrorResponse(message="Course not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )

    c = data["course"]
    result = CourseDetailOut.model_validate(c).model_dump(by_alias=True)
    result["modules"] = [module_to_out(m) for m in data["modules"]]
    if data["creator"]:
        from schemas import UserOut
        result["creator"] = UserOut.model_validate(data["creator"]).model_dump(by_alias=True)
    else:
        result["creator"] = None
    return result


@router.get("/{course_id}/modules")
async def list_modules(course_id: int, db: AsyncSession = Depends(get_db)):
    modules = await storage.get_course_modules(db, course_id)
    return [module_to_out(m) for m in modules]


@router.get("/{course_id}/concept-graph")
async def get_concept_graph(course_id: int, db: AsyncSession = Depends(get_db)):
    course_data = await storage.get_course(db, course_id)
    if course_data is None:
        return Response(
            content=ErrorResponse(message="Course not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )

    graph = await storage.get_course_concept_graph(db, course_id)
    if graph is None:
        course = course_data["course"]
        status = "generating" if (course.generation_status and course.generation_status != "failed") else "not_generated"
        return CourseConceptGraphOut(
            course_id=course_id,
            mermaid="",
            status=status,
            nodes=[],
            edges=[],
            created_at=None,
            updated_at=None,
        ).model_dump(by_alias=True)

    return CourseConceptGraphOut.model_validate(graph).model_dump(by_alias=True)


@router.post("/{course_id}/concept-graph/regenerate", status_code=202)
async def regenerate_concept_graph(
    course_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    course_data = await storage.get_course(db, course_id)
    if course_data is None:
        return Response(
            content=ErrorResponse(message="Course not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )

    background_tasks.add_task(_regenerate_concept_graph_pipeline, course_id)
    return {"message": "Detailed concept graph regeneration started."}


@router.patch("/{course_id}/publish")
async def publish_course(
    course_id: int,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    """Toggle course status between draft and published. User must be the creator."""
    data = await storage.get_course(db, course_id)
    if data is None:
        return Response(
            content=ErrorResponse(message="Course not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )
    course = data["course"]
    
    # Verify ownership
    if course.created_by != user_id:
        return Response(
            content=ErrorResponse(message="Only the course creator can publish/unpublish").model_dump_json(by_alias=True),
            status_code=403,
            media_type="application/json",
        )
    
    new_status = "published" if course.status != "published" else "draft"

    from sqlalchemy import update as sa_update
    from models import Course
    stmt = sa_update(Course).where(Course.id == course_id).values(status=new_status)
    await db.execute(stmt)
    await db.commit()

    # Re-fetch
    refreshed = await storage.get_course(db, course_id)
    c = refreshed["course"]
    result = CourseDetailOut.model_validate(c).model_dump(by_alias=True)
    result["modules"] = [module_to_out(m) for m in refreshed["modules"]]
    return result


@router.post("/{course_id}/modules", status_code=201)
async def create_module(
    course_id: int,
    body: CreateModule,
    user_id: int = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    # Verify user owns the course
    course = await storage.get_course(db, course_id)
    if course is None:
        return Response(
            content=ErrorResponse(message="Course not found").model_dump_json(by_alias=True),
            status_code=404,
            media_type="application/json",
        )
    if course["course"].created_by != user_id:
        return Response(
            content=ErrorResponse(message="Only the course creator can add modules").model_dump_json(by_alias=True),
            status_code=403,
            media_type="application/json",
        )
    
    module = await storage.create_course_module(
        db, course_id=course_id, title=body.title,
        content=body.content, sort_order=body.sort_order, quiz=body.quiz,
    )
    return module_to_out(module)

