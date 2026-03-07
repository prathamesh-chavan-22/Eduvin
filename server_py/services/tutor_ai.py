import json
import logging
from typing import Any

import httpx

from config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-small-latest"


async def _call_mistral_text(messages: list[dict], temperature: float = 0.4, timeout: float = 60.0) -> str:
    """Call Mistral and return plain text (no JSON mode)."""
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": messages,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(MISTRAL_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _build_system_prompt(module_content: str, module_title: str, learner_profile: Any) -> str:
    """Build an adaptive system prompt based on learner profile and module context."""
    level = getattr(learner_profile, "knowledge_level", "beginner")
    avg_score = getattr(learner_profile, "avg_quiz_score", 0)
    struggles = getattr(learner_profile, "struggle_topics", None) or []
    strengths = getattr(learner_profile, "strong_topics", None) or []
    pace = getattr(learner_profile, "preferred_pace", "normal")

    # Adaptive instructions based on learner level
    if level == "beginner" or avg_score < 40:
        style_instructions = (
            "The learner is a BEGINNER. Use very simple language, short sentences, "
            "and plenty of analogies and real-world examples. Break down complex ideas "
            "into small, digestible steps. Be encouraging and patient. "
            "Avoid jargon unless you immediately explain it."
        )
    elif level == "advanced" or avg_score > 80:
        style_instructions = (
            "The learner is ADVANCED. Be concise and technically precise. "
            "Challenge them with deeper insights, edge cases, and connections to broader concepts. "
            "You can use technical terminology freely. Encourage critical thinking."
        )
    else:
        style_instructions = (
            "The learner is at an INTERMEDIATE level. Balance clarity with depth. "
            "Include practical examples and explain key terms when first introduced. "
            "Build on foundational knowledge they likely already have."
        )

    # Pace adjustment
    if pace == "slow":
        style_instructions += " Take extra time to explain each point thoroughly. Use step-by-step breakdowns."
    elif pace == "fast":
        style_instructions += " Be more concise and get to the key insights quickly."

    # Struggle/strength awareness
    context_notes = ""
    if struggles:
        context_notes += f"\nThe learner has struggled with these topics: {', '.join(struggles[:5])}. Be extra clear if these come up."
    if strengths:
        context_notes += f"\nThe learner is strong in: {', '.join(strengths[:5])}. You can reference these as analogies."

    return (
        "You are an expert AI tutor embedded in a Learning Management System. "
        "Your role is to help the student understand the current course module. "
        "ALWAYS base your answers on the module content provided below. "
        "If the student asks about something outside the module scope, briefly answer but guide them back. "
        "Be conversational, supportive, and adaptive.\n\n"
        f"## Teaching Style\n{style_instructions}\n"
        f"{context_notes}\n\n"
        f"## Current Module: {module_title}\n\n"
        f"### Module Content:\n{module_content[:6000]}\n\n"
        "Keep your responses focused and under 300 words unless a detailed explanation is warranted. "
        "Use Markdown formatting for clarity (bold, lists, code blocks where relevant)."
    )


async def get_tutor_response(
    module_content: str,
    module_title: str,
    user_message: str,
    history: list[dict],
    learner_profile: Any,
) -> str:
    """Generate an AI tutor response using Mistral with adaptive context."""
    system_prompt = _build_system_prompt(module_content, module_title, learner_profile)

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 10 messages for context)
    for msg in history[-10:]:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    return await _call_mistral_text(messages, temperature=0.5, timeout=90.0)


def compute_updated_profile(
    current_profile: Any,
    quiz_score: float,
    module_title: str,
) -> dict:
    """Compute updated learner profile fields based on a new quiz score."""
    old_avg = getattr(current_profile, "avg_quiz_score", 0) or 0
    old_completed = getattr(current_profile, "total_modules_completed", 0) or 0
    struggles = list(getattr(current_profile, "struggle_topics", None) or [])
    strengths = list(getattr(current_profile, "strong_topics", None) or [])

    new_completed = old_completed + 1
    # Running average
    new_avg = round(((old_avg * old_completed) + quiz_score) / new_completed, 1)

    # Update struggles/strengths
    if quiz_score < 50:
        if module_title not in struggles:
            struggles.append(module_title)
        if module_title in strengths:
            strengths.remove(module_title)
    elif quiz_score >= 80:
        if module_title not in strengths:
            strengths.append(module_title)
        if module_title in struggles:
            struggles.remove(module_title)

    # Determine knowledge level
    if new_avg >= 80:
        knowledge_level = "advanced"
    elif new_avg >= 50:
        knowledge_level = "intermediate"
    else:
        knowledge_level = "beginner"

    # Determine pace
    if new_avg < 40:
        pace = "slow"
    elif new_avg > 80:
        pace = "fast"
    else:
        pace = "normal"

    return {
        "avg_quiz_score": new_avg,
        "total_modules_completed": new_completed,
        "struggle_topics": struggles[-10:],  # keep last 10
        "strong_topics": strengths[-10:],
        "knowledge_level": knowledge_level,
        "preferred_pace": pace,
    }
