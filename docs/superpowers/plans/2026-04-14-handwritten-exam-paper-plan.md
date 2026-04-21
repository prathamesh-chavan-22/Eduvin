# Handwritten Exam Paper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a system to generate traditional exam papers from course content, allow students to upload handwritten answer photos, and receive AI-graded scores using Mistral's Pixtral Large 2411.

**Architecture:** New SQLAlchemy models for exam papers and attempts, FastAPI router with REST endpoints, Mistral service for paper generation and Pixtral evaluation, WeasyPrint for PDF rendering, React frontend with exam tab in course player.

**Tech Stack:** Python FastAPI, SQLAlchemy, Mistral API (Pixtral Large 2411), WeasyPrint, React, TanStack Query, Shadcn/UI.

---

### Task 1: Verify MISTRAL_API_KEY in config

**Files:**
- Read: `server_py/config.py` (already has MISTRAL_API_KEY — verify it exists)
- Modify: `server_py/.env.example` (add MISTRAL_API_KEY if not present)

- [ ] **Step 1: Verify MISTRAL_API_KEY exists in config.py**

The key already exists in `server_py/config.py`:
```python
MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")
```
No changes needed.

- [ ] **Step 2: Add MISTRAL_API_KEY to .env.example if missing**

Read `server_py/.env.example`. If `MISTRAL_API_KEY` is not present, add:
```
MISTRAL_API_KEY=your_mistral_api_key_here
```

- [ ] **Step 3: Commit**

```bash
git add server_py/.env.example
git commit -m "chore: add MISTRAL_API_KEY to env example"
```

---

### Task 2: Add SQLAlchemy Models for ExamPaper and ExamAttempt

**Files:**
- Modify: `server_py/models.py` — add ExamPaper and ExamAttempt classes

- [ ] **Step 1: Add ExamPaper and ExamAttempt models**

Open `server_py/models.py`. After the last model class, add:

```python
class ExamPaper(Base):
    __tablename__ = "exam_papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id"), nullable=False, unique=True)
    generated_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    questions: Mapped[list] = mapped_column(JSON, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
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
```

- [ ] **Step 2: Verify models work by starting the server**

```bash
cd server_py && python main.py &
sleep 5 && kill %1
```

Expected: Server starts without errors, `exam_papers` and `exam_attempts` tables created automatically.

- [ ] **Step 3: Commit**

```bash
git add server_py/models.py
git commit -m "feat: add ExamPaper and ExamAttempt SQLAlchemy models"
```

---

### Task 3: Add Storage Layer CRUD Functions

**Files:**
- Modify: `server_py/storage.py`

- [ ] **Step 1: Add imports**

Update imports at top of `server_py/storage.py`:

```python
from models import User, Course, CourseModule, CourseConceptGraph, Enrollment, Notification, SpeakingPractice, SpeakingTopic, SpeakingLesson, UserLessonProgress, WorkflowAnalysis, AnalysisResult, LearnerProfile, TutorMessage, ExamPaper, ExamAttempt
```

- [ ] **Step 2: Add Exam Paper CRUD**

At end of file, add:

```python
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
```

- [ ] **Step 3: Add Exam Attempt CRUD**

```python
# --- Exam Attempts ---


async def create_exam_attempt(
    db: AsyncSession,
    exam_paper_id: int,
    user_id: int,
    image_urls: list,
) -> ExamAttempt:
    existing = await get_exam_attempt_by_user_and_paper(db, user_id, exam_paper_id)
    if existing:
        await db.delete(existing)
        await db.flush()

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
        )
    )
    return result.scalar_one_or_none()


async def update_exam_attempt_score(
    db: AsyncSession,
    attempt_id: int,
    score: int,
    total_marks: int,
    evaluation_text: str,
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
```

- [ ] **Step 4: Commit**

```bash
git add server_py/storage.py
git commit -m "feat: add exam paper and attempt CRUD functions to storage layer"
```

---

### Task 4: Add Role-Aware Auth Dependency

**Files:**
- Modify: `server_py/dependencies.py`

- [ ] **Step 1: Add require_auth_with_role**

Open `server_py/dependencies.py` and add:

```python
async def require_auth_with_role(
    user_id: Optional[int] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> tuple[int, str]:
    """Returns (user_id, role). Raises 401 if not authenticated."""
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from storage import get_user
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user_id, user.role
```

- [ ] **Step 2: Commit**

```bash
git add server_py/dependencies.py
git commit -m "feat: add require_auth_with_role dependency for role-based access"
```

---

### Task 5: Create Mistral Exam Service

**Files:**
- Create: `server_py/services/mistral_exam_service.py`

- [ ] **Step 1: Create the service**

```python
import json
import logging
import base64
from pathlib import Path
from typing import Optional

import httpx

from config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
PIXTRAL_MODEL = "pixtral-large-2411"


async def generate_exam_paper(course_title: str, objectives: Optional[list[str]], modules: list[dict]) -> dict:
    module_content = []
    for idx, mod in enumerate(modules, 1):
        module_content.append(
            f"Module {idx}: {mod['title']}\n{mod.get('content', '')[:2000]}"
        )
    content_str = "\n\n---\n\n".join(module_content)
    objectives_str = "\n".join(f"- {o}" for o in objectives) if objectives else "Not specified"

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert exam paper designer. Based on the following course content, create a "
                "traditional exam paper with a mix of question types.\n\n"
                "Requirements:\n"
                "- Mix of question types: essay (10-15 marks), short answer (5 marks), "
                "long answer (8-12 marks), definition (2-3 marks)\n"
                "- Total marks: 50-70\n"
                "- Cover all modules proportionally\n"
                "- Include a rubric for each question describing what a good answer includes\n\n"
                "Return ONLY valid JSON in this format:\n"
                '{\n  "questions": [\n    {\n      "type": "essay|short|long|definition",\n      "question": "...",\n      "marks": 10,\n      "rubric": "..."\n    }\n  ],\n  "total_marks": 60\n}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Course: {course_title}\n"
                f"Objectives:\n{objectives_str}\n"
                f"Module Content:\n{content_str}"
            ),
        },
    ]

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                MISTRAL_API_URL,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "mistral-large-latest",
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data["choices"][0]["message"]["content"]
            result = json.loads(raw)

            if "questions" not in result or "total_marks" not in result:
                raise ValueError("Invalid response structure")

            return result
    except Exception as e:
        logger.error(f"Exam paper generation failed: {e}")
        raise Exception(f"Failed to generate exam paper: {str(e)}")


async def evaluate_attempt(
    image_paths: list[str],
    questions: list[dict],
    total_marks: int,
) -> dict:
    questions_text = "\n\n".join(
        f"Q{idx+1} [{q['type'].upper()}, {q['marks']} marks]: {q['question']}\nRubric: {q.get('rubric', 'N/A')}"
        for idx, q in enumerate(questions)
    )

    image_content_parts = []
    for img_path in image_paths:
        path = Path(img_path)
        if not path.exists():
            logger.warning(f"Image not found: {img_path}")
            continue
        ext = path.suffix.lower()
        mime_type = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext[1:]}"
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        image_content_parts.append({
            "type": "image_url",
            "image_url": f"data:{mime_type};base64,{b64}",
        })

    if not image_content_parts:
        raise ValueError("No valid images provided")

    messages = [
        {
            "role": "system",
            "content": (
                "This is a student's handwritten answer sheet. Evaluate their answers against the "
                "exam paper provided below.\n\n"
                "Extract the handwriting and evaluate each answer against the rubric. "
                "Return an overall score with a brief summary.\n\n"
                "Return ONLY valid JSON:\n"
                '{\n  "score": 42,\n  "total_marks": 60,\n  "summary": "Brief overall feedback"\n}'
            ),
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"Exam Paper:\n\n{questions_text}\n\nTotal Marks: {total_marks}\n\nThe student uploaded {len(image_content_parts)} pages of handwritten work.",
                },
                *image_content_parts,
            ],
        },
    ]

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                MISTRAL_API_URL,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": PIXTRAL_MODEL,
                    "messages": messages,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data["choices"][0]["message"]["content"]
            result = json.loads(raw)

            score = max(0, min(int(result.get("score", 0)), total_marks))
            return {
                "score": score,
                "total_marks": total_marks,
                "summary": result.get("summary", "No feedback provided"),
            }
    except Exception as e:
        logger.error(f"Attempt evaluation failed: {e}")
        raise Exception(f"Failed to evaluate attempt: {str(e)}")
```

- [ ] **Step 2: Commit**

```bash
git add server_py/services/mistral_exam_service.py
git commit -m "feat: add Mistral exam service for paper generation and Pixtral evaluation"
```

---

### Task 6: Create PDF Template and Rendering Service

**Files:**
- Create: `server_py/templates/exam_paper.html`
- Create: `server_py/services/pdf_service.py`
- Modify: `server_py/requirements.txt`

- [ ] **Step 1: Create HTML template**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 2cm;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .header h1 {
            font-size: 20pt;
            margin: 0 0 4px 0;
        }
        .header .meta {
            font-size: 11pt;
            color: #333;
        }
        .instructions {
            background: #f5f5f5;
            padding: 12px;
            border: 1px solid #ccc;
            margin-bottom: 24px;
        }
        .question {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        .question-header {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .question-text {
            margin-bottom: 8px;
        }
        .answer-space {
            border: 1px dashed #ccc;
            min-height: 120px;
            padding: 8px;
            color: #999;
            font-style: italic;
        }
        .answer-space.essay {
            min-height: 200px;
        }
        .marks-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 8px;
            font-size: 10pt;
            border-radius: 3px;
            margin-left: 8px;
        }
        .total-bar {
            text-align: right;
            font-size: 14pt;
            font-weight: bold;
            margin-top: 32px;
            padding-top: 16px;
            border-top: 2px solid #000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ course_title }}</h1>
        <div class="meta">Examination Paper | Generated: {{ date }}</div>
        <div class="meta">Total Marks: {{ total_marks }} | Time Allowed: As Required</div>
    </div>

    <div class="instructions">
        <strong>Instructions:</strong> Answer all questions. Write your answers clearly on separate sheets of paper.
        Marks for each question are indicated in brackets.
    </div>

    {% for q in questions %}
    <div class="question">
        <div class="question-header">
            Question {{ loop.index }}
            <span class="marks-badge">{{ q.marks }} marks</span>
            <span style="margin-left: 8px; font-size: 10pt; color: #666; text-transform: capitalize;">[{{ q.type }}]</span>
        </div>
        <div class="question-text">{{ q.question }}</div>
        <div class="answer-space {{ 'essay' if q.type == 'essay' else '' }}">
            [Write your answer here]
        </div>
    </div>
    {% endfor %}

    <div class="total-bar">
        Total: {{ total_marks }} Marks
    </div>
</body>
</html>
```

- [ ] **Step 2: Create PDF service**

```python
import os
from datetime import datetime

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML


def render_exam_paper_pdf(
    course_title: str,
    questions: list[dict],
    total_marks: int,
) -> bytes:
    template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("exam_paper.html")

    html_content = template.render(
        course_title=course_title,
        date=datetime.now().strftime("%B %d, %Y"),
        questions=questions,
        total_marks=total_marks,
    )

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
```

- [ ] **Step 3: Add dependencies to requirements.txt**

Add to end of `server_py/requirements.txt`:
```
weasyprint
jinja2
```

- [ ] **Step 4: Commit**

```bash
git add server_py/templates/exam_paper.html server_py/services/pdf_service.py server_py/requirements.txt
git commit -m "feat: add PDF template and rendering service for exam papers"
```

---

### Task 7: Create Exam Papers Router

**Files:**
- Create: `server_py/routers/exam_papers.py`
- Modify: `server_py/main.py`

- [ ] **Step 1: Create the router**

```python
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_auth, require_auth_with_role
import storage
from services.mistral_exam_service import generate_exam_paper, evaluate_attempt
from services.pdf_service import render_exam_paper_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/exam-papers", tags=["exam-papers"])

UPLOAD_DIR = Path(__file__).parent.parent / "static" / "exam-uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _is_admin(role: str) -> bool:
    return role == "l_and_d"


@router.post("/generate/{course_id}")
async def generate_paper(
    course_id: int,
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

    try:
        result = await generate_exam_paper(
            course_title=course.title,
            objectives=course.objectives,
            modules=[{"title": m.title, "content": m.content} for m in modules],
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

    return {
        "id": paper.id,
        "courseId": paper.course_id,
        "questions": paper.questions,
        "totalMarks": paper.total_marks,
        "createdAt": paper.created_at.isoformat() if paper.created_at else None,
    }


@router.get("/by-course/{course_id}")
async def get_paper_by_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    paper = await storage.get_exam_paper_by_course(db, course_id)
    if not paper:
        raise HTTPException(status_code=404, detail="No exam paper for this course")

    return {
        "id": paper.id,
        "courseId": paper.course_id,
        "questions": paper.questions,
        "totalMarks": paper.total_marks,
        "createdAt": paper.created_at.isoformat() if paper.created_at else None,
    }


@router.get("/{paper_id}")
async def get_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    return {
        "id": paper.id,
        "courseId": paper.course_id,
        "questions": paper.questions,
        "totalMarks": paper.total_marks,
        "createdAt": paper.created_at.isoformat() if paper.created_at else None,
    }


@router.get("/{paper_id}/pdf")
async def download_pdf(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(require_auth),
):
    paper = await storage.get_exam_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Exam paper not found")

    course_data = await storage.get_course(db, paper.course_id)
    course_title = course_data["course"].title if course_data else "Exam Paper"

    pdf_bytes = render_exam_paper_pdf(
        course_title=course_title,
        questions=paper.questions,
        total_marks=paper.total_marks,
    )

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
        return {
            "id": attempt.id,
            "score": None,
            "totalMarks": paper.total_marks,
            "summary": "Evaluation failed — please try again later.",
            "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        }

    await storage.update_exam_attempt_score(
        db,
        attempt_id=attempt.id,
        score=result["score"],
        total_marks=result["total_marks"],
        evaluation_text=result["summary"],
    )

    return {
        "id": attempt.id,
        "score": result["score"],
        "totalMarks": result["total_marks"],
        "summary": result["summary"],
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
        attempt = await storage.get_exam_attempt_by_user_and_paper(db, user_id, paper_id)
        attempts = [attempt] if attempt else []

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
```

- [ ] **Step 2: Register router in main.py**

In `server_py/main.py`, update the import:

```python
from routers import auth, users, courses, enrollments, notifications, speaking, analysis, tutor, analytics, assessments, audio, exam_papers
```

Add registration:
```python
app.include_router(exam_papers.router)
```

- [ ] **Step 3: Add static mount for exam uploads**

In `server_py/main.py`, after the existing static mount:

```python
exam_upload_dir = os.path.join(os.path.dirname(__file__), "static", "exam-uploads")
os.makedirs(exam_upload_dir, exist_ok=True)
app.mount("/api/exam-uploads", StaticFiles(directory=exam_upload_dir), name="exam-uploads")
```

- [ ] **Step 4: Commit**

```bash
git add server_py/routers/exam_papers.py server_py/main.py
git commit -m "feat: add exam papers API router with all endpoints"
```

---

### Task 8: Create Frontend Exam API Hooks

**Files:**
- Create: `client/src/hooks/use-exams.ts`

- [ ] **Step 1: Create hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

export interface ExamQuestion {
  type: "essay" | "short" | "long" | "definition";
  question: string;
  marks: number;
  rubric: string;
}

export interface ExamPaper {
  id: number;
  courseId: number;
  questions: ExamQuestion[];
  totalMarks: number;
  createdAt: string;
}

export interface ExamAttempt {
  id: number;
  userId: number;
  score: number | null;
  totalMarks: number | null;
  evaluationText: string | null;
  imageUrls: string[];
  submittedAt: string;
}

export interface ExamResults {
  paperId: number;
  attempts: ExamAttempt[];
}

export function useExamPaper(courseId: number) {
  return useQuery<ExamPaper | null>({
    queryKey: ["exam-paper", courseId],
    queryFn: async () => {
      try {
        return await apiFetch<ExamPaper>(`/api/exam-papers/by-course/${courseId}`);
      } catch {
        return null;
      }
    },
    enabled: !!courseId,
  });
}

export function useExamPaperById(paperId: number) {
  return useQuery<ExamPaper>({
    queryKey: ["exam-paper-by-id", paperId],
    queryFn: () => apiFetch<ExamPaper>(`/api/exam-papers/${paperId}`),
    enabled: !!paperId,
  });
}

export function useGenerateExamPaper(courseId: number) {
  const queryClient = useQueryClient();
  return useMutation<ExamPaper, Error>({
    mutationFn: () => apiFetch<ExamPaper>(`/api/exam-papers/generate/${courseId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-paper", courseId] });
    },
  });
}

export function useUploadExamAttempt(paperId: number) {
  const queryClient = useQueryClient();
  return useMutation<ExamAttempt, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      const res = await fetch(`/api/exam-papers/${paperId}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results", paperId] });
    },
  });
}

export function useExamResults(paperId: number) {
  return useQuery<ExamResults>({
    queryKey: ["exam-results", paperId],
    queryFn: () => apiFetch<ExamResults>(`/api/exam-papers/${paperId}/results`),
    enabled: !!paperId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/use-exams.ts
git commit -m "feat: add exam API hooks for paper generation, upload, and results"
```

---

### Task 9: Create ExamPaperTab Component

**Files:**
- Create: `client/src/components/exam/ExamPaperTab.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateExamPaper, useExamPaper } from "@/hooks/use-exams";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Upload, FileText, Loader2 } from "lucide-react";
import ExamUploadDialog from "./ExamUploadDialog";
import ExamResultsView from "./ExamResultsView";

interface Props {
  courseId: number;
}

export default function ExamPaperTab({ courseId }: Props) {
  const { user } = useAuth();
  const { data: paper, isLoading } = useExamPaper(courseId);
  const generateMutation = useGenerateExamPaper(courseId);
  const [showUpload, setShowUpload] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!paper) {
    if (user?.role === "l_and_d") {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Exam Paper Generated</h3>
          <p className="text-muted-foreground mb-4">
            Generate an exam paper from this course's content.
          </p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Exam Paper
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center py-8 text-muted-foreground">
        No exam paper available for this course yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exam Paper Generated</h3>
          <p className="text-sm text-muted-foreground">
            {paper.questions.length} questions | {paper.totalMarks} total marks
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/exam-papers/${paper.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </a>
          {user?.role === "employee" && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="mr-1 h-4 w-4" /> Upload Answer
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {paper.questions.map((q, idx) => (
          <div key={idx} className="p-4 border rounded">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">Question {idx + 1}</span>
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                {q.marks} marks
              </span>
              <span className="text-xs text-muted-foreground capitalize">[{q.type}]</span>
            </div>
            <p className="text-sm">{q.question}</p>
          </div>
        ))}
      </div>

      {showUpload && (
        <ExamUploadDialog
          paperId={paper.id}
          totalMarks={paper.totalMarks}
          onClose={() => setShowUpload(false)}
        />
      )}

      <ExamResultsView paperId={paper.id} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/exam/ExamPaperTab.tsx
git commit -m "feat: create ExamPaperTab component with generate, preview, and upload"
```

---

### Task 10: Add Exam Tab to Course Player

**Files:**
- Modify: `client/src/pages/courses/player.tsx`

- [ ] **Step 1: Add exam tab state and button**

In `player.tsx`, find the existing tab/view state (likely `contentView` state). Add:

```tsx
const [activeTab, setActiveTab] = useState<"content" | "graph" | "exam">("content");
```

Find where the tab buttons are rendered and add an exam tab button:

```tsx
<Button
  variant={activeTab === "exam" ? "default" : "ghost"}
  size="sm"
  onClick={() => setActiveTab("exam")}
>
  Exam Paper
</Button>
```

- [ ] **Step 2: Add exam tab content section**

Find where the content is rendered based on the current view/tab, and add:

```tsx
{activeTab === "exam" && <ExamPaperTab courseId={courseId} />}
```

Add the import at the top:
```tsx
import ExamPaperTab from "@/components/exam/ExamPaperTab";
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/courses/player.tsx
git commit -m "feat: add exam paper tab to course player"
```

---

### Task 11: Create ExamUploadDialog Component

**Files:**
- Create: `client/src/components/exam/ExamUploadDialog.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState, useCallback } from "react";
import { useUploadExamAttempt } from "@/hooks/use-exams";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, ImagePlus } from "lucide-react";

interface Props {
  paperId: number;
  totalMarks: number;
  onClose: () => void;
}

export default function ExamUploadDialog({ paperId, totalMarks, onClose }: Props) {
  const { toast } = useToast();
  const uploadMutation = useUploadExamAttempt(paperId);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length + files.length > 3) {
      toast({ title: "Maximum 3 images allowed", variant: "destructive" });
      return;
    }
    setFiles(prev => [...prev, ...imageFiles]);
  }, [files.length, toast]);

  const handleSubmit = () => {
    if (files.length === 0) {
      toast({ title: "Please upload at least one image", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(files, {
      onSuccess: (data) => {
        toast({
          title: "Exam Submitted!",
          description: data.score !== null
            ? `Score: ${data.score}/${data.totalMarks}`
            : "Evaluation in progress...",
        });
        onClose();
      },
      onError: () => {
        toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upload Answer Sheet</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Upload 1-3 photos of your handwritten answers. Max 5MB per image.
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? "border-primary bg-primary/5" : "border-muted"}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => document.getElementById("exam-file-input")?.click()}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag & drop images or click to browse
          </p>
          <input
            id="exam-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground ml-2">
                  {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploadMutation.isPending || files.length === 0}>
            {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Evaluation
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/exam/ExamUploadDialog.tsx
git commit -m "feat: create ExamUploadDialog with drag-and-drop image upload"
```

---

### Task 12: Create ExamResultsView Component

**Files:**
- Create: `client/src/components/exam/ExamResultsView.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useExamResults } from "@/hooks/use-exams";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  paperId: number;
}

export default function ExamResultsView({ paperId }: Props) {
  const { user } = useAuth();
  const { data: results, isLoading } = useExamResults(paperId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!results || results.attempts.length === 0) {
    return null;
  }

  if (user?.role === "l_and_d") {
    return (
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Student Results ({results.attempts.length} submissions)</h4>
        <div className="space-y-2">
          {results.attempts.slice(0, 10).map((a) => (
            <Card key={a.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium">User #{a.userId}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {a.score !== null && a.totalMarks !== null ? (
                <span className={`font-bold text-lg ${a.score / a.totalMarks >= 0.5 ? "text-green-600" : "text-red-600"}`}>
                  {a.score}/{a.totalMarks}
                </span>
              ) : (
                <span className="text-muted-foreground">Not evaluated</span>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const myAttempts = results.attempts.filter(a => a.userId === user?.id);
  const latestAttempt = myAttempts[0];

  if (!latestAttempt || latestAttempt.score === null) {
    return null;
  }

  const pct = Math.round((latestAttempt.score / (latestAttempt.totalMarks || 1)) * 100);
  const passed = pct >= 50;

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Your Result</h4>
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {passed ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <span className={`text-4xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
            {pct}%
          </span>
        </div>
        <p className="text-lg font-medium">
          {latestAttempt.score} / {latestAttempt.totalMarks}
        </p>
        {latestAttempt.evaluationText && (
          <p className="text-sm text-muted-foreground mt-3 italic">
            {latestAttempt.evaluationText}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Submitted: {new Date(latestAttempt.submittedAt).toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/exam/ExamResultsView.tsx
git commit -m "feat: create ExamResultsView for student and admin score display"
```

---

### Task 13: Install Dependencies & Configure Environment

**Files:**
- Modify: `server_py/.env` (user provides actual key — NOT committed)

- [ ] **Step 1: Install Python dependencies**

```bash
cd server_py && pip install weasyprint jinja2
```

- [ ] **Step 2: Add MISTRAL_API_KEY to .env**

The user must add their Mistral API key to `server_py/.env`:
```
MISTRAL_API_KEY=your_actual_key_here
```

This is NOT committed to git.

- [ ] **Step 3: Verify server starts**

```bash
cd server_py && python main.py &
sleep 5 && kill %1
```

Expected: No import errors, all routers registered.

---

### Task 14: Full Flow Manual Test

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1
cd server_py && python main.py

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 2: Test complete flow**

1. Login as L&D Admin
2. Navigate to any course → "Exam Paper" tab
3. Click "Generate Exam Paper" → wait for questions to appear
4. Click "Download PDF" → verify PDF downloads
5. Logout, login as employee (`employee@lms.local`)
6. Go to same course → "Exam Paper" tab
7. Click "Upload Answer" → upload 1-2 photos of handwriting
8. Submit → wait for Pixtral evaluation → verify score displays

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Plan SELF-REVIEW

### 1. Spec Coverage

| Spec Requirement | Task |
|---|---|
| ExamPaper + ExamAttempt models | Task 2 |
| Storage CRUD functions | Task 3 |
| Role-aware auth | Task 4 |
| Paper generation via Mistral | Task 5 |
| Pixtral evaluation (1-3 images) | Task 5 |
| PDF via WeasyPrint | Task 6 |
| All API endpoints | Task 7 |
| Static file serving | Task 7 |
| Frontend hooks | Task 8 |
| ExamPaperTab component | Task 9 |
| Exam tab in player | Task 10 |
| ExamUploadDialog | Task 11 |
| ExamResultsView | Task 12 |
| Dependencies + env | Task 13 |
| Manual testing | Task 14 |

### 2. Placeholder Scan
No "TBD", "TODO", or incomplete sections.

### 3. Type Consistency
- All endpoints return camelCase dicts matching frontend interfaces
- `require_auth_with_role` returns `tuple[int, str]` — used consistently in Task 7
- `ExamPaper.questions` is JSON/list everywhere
- `ExamAttempt.image_urls` is JSON/list everywhere
- Frontend `ExamQuestion` type matches backend question structure

### 4. No Missing Pieces
- The `apiFetch` in hooks is self-contained (doesn't rely on existing lib)
- All components are created fresh — no missing imports
- Router uses existing `require_auth` pattern + new `require_auth_with_role`
- PDF download uses `<a href>` direct link — no blob complexity
