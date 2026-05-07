# Handwritten Exam Paper Generation & AI Scoring

**Date:** 2026-04-14
**Status:** Approved

## Overview

A system that generates traditional exam papers (essay, short answer, long answer, definition questions) from existing course content, allows students to download/print the paper, write answers by hand, upload photos of their handwriting, and receive an AI-graded score using Mistral's Pixtral Large 2411 vision model.

## Requirements Summary

| Decision | Choice |
|---|---|
| Question types | Essay, short answer, long answer, definitions (no MCQs) |
| Content source | Entire course content (auto-generated, no manual selection) |
| Scoring scope | Overall score only — no per-question breakdown |
| Paper format | On-screen preview + PDF download (A4 printable) |
| Access control | L&D Admin generates; Student uploads & views own score; Admin reviews all |
| Availability | Available anytime during course (no progress prerequisite) |
| OCR/Scoring engine | Mistral Pixtral Large 2411 (multimodal vision model) |
| Image batch size | 1-3 images per API call |
| Approach | Single flow: Generate → Download → Upload → Score |

## User Flow

1. **L&D Admin** navigates to a course page → clicks "Generate Exam Paper"
2. AI generates exam paper from all course module content
3. Paper displayed on-screen + downloadable as PDF
4. **Student** opens course page → sees available exam paper → downloads/prints
5. Student writes answers by hand on physical paper
6. Student uploads photos of handwritten pages (1-3 at a time)
7. Pixtral Large extracts handwriting and evaluates answers
8. Overall score returned and stored in database
9. Student views their score on the course page
10. L&D Admin can view all students' scores for any course

## Database Schema

### New Tables

```sql
CREATE TABLE exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    generated_by UUID NOT NULL REFERENCES users(id),
    questions JSONB NOT NULL,
    total_marks INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id)  -- one active paper per course; regeneration replaces existing
);

CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_paper_id UUID NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_urls JSONB NOT NULL,
    score INT,
    total_marks INT,
    evaluation_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### SQLAlchemy Models

**`ExamPaper`**:
- `id` (UUID, PK)
- `course_id` (UUID, FK → courses, unique constraint — one paper per course)
- `generated_by` (UUID, FK → users)
- `questions` (JSONB) — array of `{type, question, marks, rubric}`
- `total_marks` (INT)
- `created_at` (TIMESTAMPTZ)

**`ExamAttempt`**:
- `id` (UUID, PK)
- `exam_paper_id` (UUID, FK → exam_papers)
- `user_id` (UUID, FK → users)
- `image_urls` (JSONB) — array of image file paths
- `score` (INT, nullable until evaluated)
- `total_marks` (INT)
- `evaluation_text` (TEXT, nullable)
- `submitted_at` (TIMESTAMPTZ)

## Backend Architecture

### New API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/exam-papers/generate/{course_id}` | L&D Admin | Generate exam paper from course content |
| `GET` | `/api/exam-papers/{id}` | Any authenticated | Get paper details with questions |
| `GET` | `/api/exam-papers/{id}/pdf` | Any authenticated | Download paper as PDF |
| `POST` | `/api/exam-papers/{id}/upload` | Student | Upload handwritten answer images |
| `GET` | `/api/exam-papers/{id}/results` | Student (own), Admin (all) | View scores for an exam paper |
| `DELETE` | `/api/exam-papers/{id}` | L&D Admin | Delete exam paper and all attempts |

### New Files

```
server_py/
├── routers/
│   └── exam_papers.py          # All exam paper endpoints
├── services/
│   └── mistral_exam_service.py # Paper generation + Pixtral evaluation
└── templates/
    └── exam_paper.html         # HTML template for PDF rendering
```

### Service Layer: `mistral_exam_service.py`

**`generate_exam_paper(course_content: dict)`**:
1. Receives course title, objectives, and all module content
2. Sends to Mistral (mistral-large or similar) with structured prompt
3. Returns parsed JSON: `{questions: [...], total_marks: int}`
4. Questions distributed across types: ~40% essay, ~25% short answer, ~20% long answer, ~15% definitions
5. Total marks: 50-70, covering all modules proportionally

**`evaluate_attempt(images: list, questions: list, rubrics: list)`**:
1. Receives 1-3 image paths + the exam questions and rubrics
2. Sends images + prompt to Pixtral Large (`pixtral-large-2411`)
3. Pixtral extracts handwriting AND evaluates in single call
4. Returns: `{score: int, total_marks: int, summary: str}`

### PDF Generation

- **Library:** WeasyPrint (pip install weasyprint)
- **Template:** `server_py/templates/exam_paper.html` — clean A4 layout
- **Rendered server-side** → returned as `FileResponse` with `Content-Disposition: attachment`
- Includes: course title, date, marks per question, all questions with space indicators

### Storage Layer Updates (`storage.py`)

New CRUD functions:
- `create_exam_paper(course_id, questions, total_marks, generated_by)`
- `get_exam_paper(paper_id)`
- `get_exam_paper_by_course(course_id)`
- `delete_exam_paper(paper_id)` — deletes paper AND all associated attempts (CASCADE)
- `create_exam_attempt(paper_id, user_id, image_urls)`
- `get_exam_attempt(attempt_id)`
- `update_exam_attempt_score(attempt_id, score, total_marks, evaluation_text)`
- `get_exam_attempts_for_paper(paper_id)`
- `get_exam_attempts_for_user(user_id)`

## Frontend Architecture

### New Pages/Components

**`client/src/pages/courses/` — modified `player.tsx`**:
- Add "Exam Paper" tab visible for all users on any course page
- Tab content varies by role

**`client/src/pages/exams/`**:
- `ExamPaperView.tsx` — Displays generated paper on-screen (formatted, print-friendly)
- `ExamUpload.tsx` — Drag-and-drop image upload, progress indicator, submit button
- `ExamResults.tsx` — Displays score prominently (large number, e.g., "42/60"), evaluation summary text

### Frontend Flow

1. "Exam Paper" tab on course player page
2. If no paper exists: L&D Admin sees "Generate Exam Paper" button
3. If paper exists: Everyone sees preview + "Download PDF" button
4. Students see "Upload Answer Sheet" button → opens upload dialog
5. After upload → loading spinner → results displayed
6. Students can re-upload (overwrites previous attempt)

## Error Handling

| Scenario | Handling |
|---|---|
| Blurry/unreadable image | Pixtral returns low confidence → "Unable to read handwriting — please re-upload" |
| Blank page (no writing) | Scored as 0, noted in evaluation summary |
| Wrong paper uploaded | Backend validates exam_paper_id exists before processing |
| Pixtral API fails/times out | Retry once → "Evaluation failed — try again later" |
| Duplicate submission | Re-upload overwrites previous attempt (no block) |
| Image too large | Frontend compresses to max 5MB per image before upload |
| No exam paper generated yet | Student sees "No exam paper available for this course" |

## AI Prompts

### Paper Generation Prompt

```
You are an expert exam paper designer. Based on the following course content, create a 
traditional exam paper with a mix of question types.

Course: {title}
Objectives: {objectives}
Module Content: {all module titles and content}

Requirements:
- Mix of question types: essay (10-15 marks), short answer (5 marks), 
  long answer (8-12 marks), definition (2-3 marks)
- Total marks: 50-70
- Cover all modules proportionally
- Include a rubric for each question describing what a good answer includes

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "type": "essay|short|long|definition",
      "question": "...",
      "marks": 10,
      "rubric": "..."
    }
  ],
  "total_marks": 60
}
```

### Evaluation Prompt (Pixtral Large)

```
This is a student's handwritten answer sheet. Evaluate their answers against the 
exam paper provided below.

Exam Paper:
{questions with marks and rubrics}

The student uploaded {count} pages of handwritten work.

Extract the handwriting and evaluate each answer against the rubric. 
Return an overall score out of {total_marks} with a brief summary.

Return ONLY valid JSON:
{
  "score": 42,
  "total_marks": 60,
  "summary": "Brief overall feedback"
}
```

## Security & Access Control

- **Paper generation:** L&D Admin only (role check in route handler)
- **Paper viewing:** Any authenticated user enrolled in the course
- **PDF download:** Any enrolled user
- **Upload answers:** Student role, enrolled in the course
- **View results:** Student sees own attempts; L&D Admin sees all for a course
- **Image storage:** Served only to authenticated users who own the attempt

## Dependencies

- `weasyprint` — PDF rendering (new pip dependency)
- `mistralai` — already in requirements.txt (reuse for paper generation)
- **Pixtral Large API:** Uses Mistral API key (separate from GROQ_API_KEY). Add `MISTRAL_API_KEY` to `.env`
