import json
import logging
import base64
import asyncio
import re
from pathlib import Path
from typing import Optional

import httpx
from json_repair import repair_json

from config import MISTRAL_API_KEY, GROQ_API_KEY

logger = logging.getLogger(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
PIXTRAL_MODEL = "pixtral-large-2411"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _coerce_message_content(raw: object) -> str:
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list):
        parts: list[str] = []
        for item in raw:
            if isinstance(item, dict):
                txt = item.get("text")
                if isinstance(txt, str) and txt.strip():
                    parts.append(txt.strip())
            elif isinstance(item, str) and item.strip():
                parts.append(item.strip())
        return "\n".join(parts).strip()
    if raw is None:
        return ""
    return str(raw).strip()


def _parse_json_object(raw: str) -> dict:
    payload = _coerce_message_content(raw)
    if not payload:
        raise ValueError("Empty model response")

    try:
        parsed = json.loads(payload)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", payload, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1).strip()
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed

    start = payload.find("{")
    end = payload.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = payload[start : end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    # Final fallback: repair malformed JSON-like output from model.
    try:
        repaired = repair_json(payload)
        parsed = repaired if isinstance(repaired, dict) else json.loads(repaired)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    raise ValueError("Model response did not contain a valid JSON object")


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

    encoded_images: list[dict] = []
    for img_path in image_paths:
        path = Path(img_path)
        if not path.exists():
            logger.warning(f"Image not found: {img_path}")
            continue
        ext = path.suffix.lower()
        mime_type = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext[1:]}"
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        encoded_images.append({"mime_type": mime_type, "b64": b64})

    if not encoded_images:
        raise ValueError("No valid images provided")

    mistral_image_parts = [
        {
            "type": "image_url",
            "image_url": f"data:{img['mime_type']};base64,{img['b64']}",
        }
        for img in encoded_images
    ]

    groq_image_parts = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:{img['mime_type']};base64,{img['b64']}",
            },
        }
        for img in encoded_images
    ]

    mistral_messages = [
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
                    "text": f"Exam Paper:\n\n{questions_text}\n\nTotal Marks: {total_marks}\n\nThe student uploaded {len(encoded_images)} pages of handwritten work.",
                },
                *mistral_image_parts,
            ],
        },
    ]

    groq_messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "This is a student's handwritten answer sheet. Evaluate their answers against the exam paper.\n\n"
                        "Extract the handwriting and evaluate each answer against the rubric.\n"
                        "Return ONLY valid JSON: {\"score\": 42, \"total_marks\": 60, \"summary\": \"Brief overall feedback\"}.\n\n"
                        f"Exam Paper:\n\n{questions_text}\n\nTotal Marks: {total_marks}\n\n"
                        f"The student uploaded {len(encoded_images)} pages of handwritten work."
                    ),
                },
                *groq_image_parts,
            ],
        }
    ]

    try:
        # 1) Primary: Mistral Pixtral
        if MISTRAL_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp: httpx.Response | None = None
                    for retry_idx in range(2):
                        resp = await client.post(
                            MISTRAL_API_URL,
                            headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                            json={
                                "model": PIXTRAL_MODEL,
                                "messages": mistral_messages,
                                "temperature": 0.1,
                                "response_format": {"type": "json_object"},
                            },
                        )

                        try:
                            resp.raise_for_status()
                            break
                        except httpx.HTTPStatusError:
                            if resp.status_code == 429 and retry_idx == 0:
                                retry_after = resp.headers.get("Retry-After")
                                try:
                                    wait_seconds = int(float(retry_after)) if retry_after else 3
                                except (TypeError, ValueError):
                                    wait_seconds = 3
                                wait_seconds = max(1, min(wait_seconds, 10))
                                logger.warning(f"Mistral rate limited (429). Retrying in {wait_seconds}s.")
                                await asyncio.sleep(wait_seconds)
                                continue
                            raise

                    if resp is None:
                        raise ValueError("No response received from Mistral evaluation service")

                    data = resp.json()
                    raw = data["choices"][0]["message"]["content"]
                    result = _parse_json_object(raw)

                    score = max(0, min(int(result.get("score", 0)), total_marks))
                    return {
                        "score": score,
                        "total_marks": total_marks,
                        "summary": result.get("summary", "No feedback provided"),
                    }
            except Exception as mistral_err:
                logger.warning(f"Mistral exam evaluation failed, will try Groq fallback: {mistral_err}")

        # 2) Fallback: Groq Llama-4 vision (base64 data URL)
        if GROQ_API_KEY:
            async with httpx.AsyncClient(timeout=120.0) as client:
                groq_resp = await client.post(
                    GROQ_API_URL,
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": GROQ_VISION_MODEL,
                        "messages": groq_messages,
                        "temperature": 0.1,
                    },
                )
                groq_resp.raise_for_status()
                groq_data = groq_resp.json()
                groq_raw = groq_data["choices"][0]["message"]["content"]
                groq_result = _parse_json_object(groq_raw)

                score = max(0, min(int(groq_result.get("score", 0)), total_marks))
                return {
                    "score": score,
                    "total_marks": total_marks,
                    "summary": groq_result.get("summary", "No feedback provided"),
                }

        raise ValueError("No AI provider available for exam evaluation (MISTRAL_API_KEY/GROQ_API_KEY missing)")
    except Exception as e:
        logger.error(f"Attempt evaluation failed: {e}")
        raise Exception(f"Failed to evaluate attempt: {str(e)}")
