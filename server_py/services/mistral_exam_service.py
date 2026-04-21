import json
import logging
import base64
import asyncio
import re
import math
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
BLOOM_LEVELS = ("remember", "understand", "apply", "analyze", "evaluate", "create")


def normalize_blooms_distribution(
    requested_distribution: Optional[dict[str, int]],
    question_count: int,
) -> dict[str, int]:
    if question_count <= 0:
        raise ValueError("question_count must be greater than 0")

    sanitized: dict[str, int] = {}
    if requested_distribution:
        for level in BLOOM_LEVELS:
            raw_value = requested_distribution.get(level, 0)
            try:
                value = int(raw_value)
            except (TypeError, ValueError):
                value = 0
            sanitized[level] = max(0, value)
    else:
        sanitized = {level: 1 for level in BLOOM_LEVELS}

    if sum(sanitized.values()) == 0:
        sanitized = {level: 1 for level in BLOOM_LEVELS}

    total_weight = sum(sanitized.values())
    raw_allocations = {
        level: (sanitized[level] / total_weight) * question_count
        for level in BLOOM_LEVELS
    }
    base_allocations = {
        level: int(math.floor(raw_allocations[level]))
        for level in BLOOM_LEVELS
    }

    allocated = sum(base_allocations.values())
    remaining = question_count - allocated
    if remaining > 0:
        remainder_order = sorted(
            BLOOM_LEVELS,
            key=lambda level: raw_allocations[level] - base_allocations[level],
            reverse=True,
        )
        idx = 0
        while remaining > 0:
            level = remainder_order[idx % len(remainder_order)]
            base_allocations[level] += 1
            remaining -= 1
            idx += 1

    return base_allocations


def score_live_exam_answers(questions: list[dict], answers: list) -> dict:
    def _normalize_answer(value):
        if isinstance(value, str):
            return value.strip().lower()
        return value

    total_marks = sum(max(1, int(q.get("marks", 1) or 1)) for q in questions)
    score = 0
    correct_answers = 0
    auto_graded_questions = 0

    for idx, question in enumerate(questions):
        expected = question.get("answer")
        if expected is None:
            continue

        auto_graded_questions += 1
        submitted = answers[idx] if idx < len(answers) else None
        marks = max(1, int(question.get("marks", 1) or 1))

        expected_normalized = _normalize_answer(expected)
        submitted_normalized = _normalize_answer(submitted)
        if submitted_normalized == expected_normalized:
            score += marks
            correct_answers += 1

    if auto_graded_questions == 0:
        summary = "No auto-gradable questions found. Submission recorded for manual review."
    else:
        summary = (
            f"Auto-graded {auto_graded_questions} questions. "
            f"Correct: {correct_answers}."
        )

    return {
        "score": score,
        "total_marks": total_marks,
        "correct_answers": correct_answers,
        "auto_graded_questions": auto_graded_questions,
        "summary": summary,
    }


def sanitize_questions_for_live_exam(questions: list[dict]) -> list[dict]:
    sanitized = []
    for q in questions:
        item = dict(q)
        item.pop("answer", None)
        item.pop("answer_key", None)
        sanitized.append(item)
    return sanitized


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


async def generate_exam_paper(
    course_title: str,
    objectives: Optional[list[str]],
    modules: list[dict],
    *,
    question_count: int = 10,
    blooms_distribution: Optional[dict[str, int]] = None,
    question_format: str = "mixed",
) -> dict:
    if question_count <= 0:
        raise ValueError("question_count must be greater than 0")
    if question_format not in {"mixed", "objective", "subjective"}:
        raise ValueError("question_format must be one of: mixed, objective, subjective")

    normalized_distribution = normalize_blooms_distribution(
        blooms_distribution,
        question_count=question_count,
    )
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
                "traditional exam paper with Bloom's taxonomy aligned questions.\n\n"
                "Requirements:\n"
                f"- Generate exactly {question_count} questions\n"
                f"- Use this question format: {question_format}\n"
                "- Mix of question types: essay (10-15 marks), short answer (5 marks), "
                "long answer (8-12 marks), definition (2-3 marks), MCQ (2-5 marks)\n"
                "- Tag each question with bloom_level from: remember, understand, apply, analyze, evaluate, create\n"
                "- If question format is objective or mixed, include options[] and answer for objective/MCQ items\n"
                "- Cover all modules proportionally\n"
                "- Include a rubric for each question describing what a good answer includes\n\n"
                "Return ONLY valid JSON in this format:\n"
                '{\n  "questions": [\n    {\n      "type": "essay|short|long|definition|mcq",\n      "bloom_level": "remember|understand|apply|analyze|evaluate|create",\n      "question": "...",\n      "marks": 10,\n      "rubric": "...",\n      "options": ["A","B","C","D"],\n      "answer": "B"\n    }\n  ],\n  "total_marks": 60\n}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Course: {course_title}\n"
                f"Objectives:\n{objectives_str}\n"
                f"Bloom Distribution Target: {json.dumps(normalized_distribution)}\n"
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
            result = _parse_json_object(raw)

            if "questions" not in result or "total_marks" not in result:
                raise ValueError("Invalid response structure")

            questions = result.get("questions", [])
            if not isinstance(questions, list) or not questions:
                raise ValueError("No questions generated")

            trimmed_questions = questions[:question_count]
            for idx, question in enumerate(trimmed_questions):
                if not isinstance(question, dict):
                    raise ValueError("Question format invalid")
                question.setdefault("type", "short")
                question.setdefault("question", f"Question {idx + 1}")
                question["marks"] = max(1, int(question.get("marks", 1) or 1))
                question.setdefault("rubric", "Answer covers key concepts accurately.")
                bloom_level = str(question.get("bloom_level", "")).strip().lower()
                if bloom_level not in BLOOM_LEVELS:
                    fallback = [lvl for lvl, count in normalized_distribution.items() if count > 0]
                    question["bloom_level"] = fallback[idx % len(fallback)] if fallback else "understand"
                else:
                    question["bloom_level"] = bloom_level

                if question.get("type") == "mcq":
                    options = question.get("options")
                    if not isinstance(options, list) or len(options) < 2:
                        question["options"] = ["Option A", "Option B", "Option C", "Option D"]
                    if "answer" not in question:
                        question["answer"] = question["options"][0]

            return {
                "questions": trimmed_questions,
                "total_marks": sum(int(q.get("marks", 1)) for q in trimmed_questions),
                "blooms_distribution": normalized_distribution,
                "question_format": question_format,
            }
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
