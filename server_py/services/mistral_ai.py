import asyncio
import json
import logging
from typing import Any

import httpx

from config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-small-latest"
CONCURRENCY_LIMIT = 5

_semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)


async def _call_mistral(messages: list[dict], temperature: float = 0.3) -> str:
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    async with _semaphore:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(MISTRAL_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]


async def detect_csv_columns(headers: list[str], sample_rows: list[list[str]]) -> dict[str, str]:
    sample_text = "\n".join([",".join(headers)] + [",".join(row) for row in sample_rows[:3]])

    messages = [
        {
            "role": "system",
            "content": (
                "You are a data analyst assistant. Given CSV headers and sample rows, "
                "identify which columns map to: employee_name, department, manager_remarks. "
                "Return a JSON object mapping these keys to the actual column header names. "
                "Only include keys where you can confidently identify a matching column. "
                "Example: {\"employee_name\": \"Name\", \"department\": \"Dept\", \"manager_remarks\": \"Manager Comments\"}"
            ),
        },
        {
            "role": "user",
            "content": f"CSV data:\n{sample_text}",
        },
    ]

    raw = await _call_mistral(messages)
    return json.loads(raw)


async def analyze_remarks(
    employee_name: str,
    department: str | None,
    remarks: str,
    existing_courses: list[dict[str, Any]],
) -> dict[str, Any]:
    courses_context = ""
    if existing_courses:
        courses_list = "\n".join(
            f"- ID:{c['id']} \"{c['title']}\": {c['description'][:100]}"
            for c in existing_courses
        )
        courses_context = f"\n\nExisting courses available:\n{courses_list}"

    messages = [
        {
            "role": "system",
            "content": (
                "You are an L&D (Learning & Development) analyst. Analyze employee manager remarks "
                "and provide training recommendations. Return a JSON object with:\n"
                "- \"summary\": A brief interpretation of the manager's feedback (1-2 sentences)\n"
                "- \"recommended_skills\": Array of skill areas the employee should develop\n"
                "- \"matched_courses\": Array of course IDs from existing courses that match (integers only)\n"
                "- \"suggested_trainings\": Array of objects with {\"title\", \"description\", \"reason\"} "
                "for new training that doesn't exist yet"
                + courses_context
            ),
        },
        {
            "role": "user",
            "content": (
                f"Employee: {employee_name}\n"
                f"Department: {department or 'Unknown'}\n"
                f"Manager Remarks: {remarks}"
            ),
        },
    ]

    raw = await _call_mistral(messages)
    result = json.loads(raw)

    return {
        "summary": result.get("summary", ""),
        "recommended_skills": result.get("recommended_skills", []),
        "matched_courses": [int(cid) for cid in result.get("matched_courses", [])],
        "suggested_trainings": result.get("suggested_trainings", []),
    }
