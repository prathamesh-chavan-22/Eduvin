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
