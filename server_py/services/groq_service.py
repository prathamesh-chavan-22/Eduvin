import os
import json
import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from collections import Counter
import httpx
from json_repair import repair_json

from config import MISTRAL_API_KEY

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CHUNK_MIN_WORDS = 1500
CHUNK_MAX_WORDS = 2000
PARAGRAPH_BREAK = re.compile(r"\n\s*\n")
SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
NODE_TYPE_VALUES = {"root", "topic", "subtopic", "detail", "action_item", "decision"}
OUTPUT_SCHEMA_VERSION = "2.0"
MISTRAL_CHAT_API_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_TRANSCRIBE_API_URL = "https://api.mistral.ai/v1/audio/transcriptions"
MINDMAP_PRIMARY_MODEL = "mistral-small-latest"
MINDMAP_FALLBACK_MODEL = "mistral-large-latest"
MINDMAP_MODELS = [MINDMAP_PRIMARY_MODEL, MINDMAP_FALLBACK_MODEL]
TRANSCRIPTION_MODEL = "voxtral-mini-latest"

# ---------------------------------------------------------------------------
# Transcript chunking helpers
# ---------------------------------------------------------------------------


def _split_paragraphs(text: str) -> List[str]:
    """Split transcript into paragraphs, preserving non-empty blocks."""
    return [p.strip() for p in PARAGRAPH_BREAK.split(text) if p.strip()]


def _count_words(text: str) -> int:
    return len(text.split())


def _chunk_transcript(transcript: str) -> List[Dict[str, Any]]:
    """
    Split a transcript into semantically-aware chunks of ~1500-2000 words.

    Strategy:
    1. Split on paragraph boundaries first.
    2. Greedily accumulate paragraphs until we hit CHUNK_MIN_WORDS.
    3. Once over the minimum, look ahead for the next natural paragraph
       boundary (stop as soon as we reach CHUNK_MAX_WORDS).

    Returns a list of dicts:
        {
            "text": str,
            "word_count": int,
            "start_paragraph_index": int,
            "end_paragraph_index": int,
        }
    """
    paragraphs = _split_paragraphs(transcript)
    if not paragraphs:
        return []

    chunks: List[Dict[str, Any]] = []
    current_paragraphs: List[str] = []
    current_word_count = 0
    start_idx = 0

    for i, para in enumerate(paragraphs):
        para_words = _count_words(para)

        # If a single paragraph exceeds CHUNK_MAX_WORDS, force-split it.
        if para_words > CHUNK_MAX_WORDS:
            # Flush whatever we have accumulated so far.
            if current_paragraphs:
                chunks.append(
                    {
                        "text": "\n\n".join(current_paragraphs),
                        "word_count": current_word_count,
                        "start_paragraph_index": start_idx,
                        "end_paragraph_index": i - 1,
                    }
                )
            # Force-split the oversized paragraph by sentences.
            sentences = SENTENCE_BOUNDARY.split(para)
            bucket: List[str] = []
            bucket_words = 0
            for sent in sentences:
                sent_words = _count_words(sent)
                if bucket_words + sent_words > CHUNK_MAX_WORDS and bucket_words >= CHUNK_MIN_WORDS:
                    chunks.append(
                        {
                            "text": " ".join(bucket),
                            "word_count": bucket_words,
                            "start_paragraph_index": i,
                            "end_paragraph_index": i,
                        }
                    )
                    bucket = []
                    bucket_words = 0
                bucket.append(sent)
                bucket_words += sent_words
            if bucket:
                chunks.append(
                    {
                        "text": " ".join(bucket),
                        "word_count": bucket_words,
                        "start_paragraph_index": i,
                        "end_paragraph_index": i,
                    }
                )
            current_paragraphs = []
            current_word_count = 0
            start_idx = i + 1
            continue

        # Normal accumulation.
        current_paragraphs.append(para)
        current_word_count += para_words

        if current_word_count >= CHUNK_MIN_WORDS:
            # We've reached the minimum; decide whether to stop or keep going.
            if current_word_count >= CHUNK_MAX_WORDS:
                # Hard cap reached — flush now.
                chunks.append(
                    {
                        "text": "\n\n".join(current_paragraphs),
                        "word_count": current_word_count,
                        "start_paragraph_index": start_idx,
                        "end_paragraph_index": i,
                    }
                )
                current_paragraphs = []
                current_word_count = 0
                start_idx = i + 1
            # If we're between MIN and MAX, peek at the next paragraph.
            elif i + 1 < len(paragraphs):
                next_words = _count_words(paragraphs[i + 1])
                if current_word_count + next_words > CHUNK_MAX_WORDS:
                    # Adding the next paragraph would overshoot; flush now.
                    chunks.append(
                        {
                            "text": "\n\n".join(current_paragraphs),
                            "word_count": current_word_count,
                            "start_paragraph_index": start_idx,
                            "end_paragraph_index": i,
                        }
                    )
                    current_paragraphs = []
                    current_word_count = 0
                    start_idx = i + 1

    # Flush any remainder.
    if current_paragraphs:
        chunks.append(
            {
                "text": "\n\n".join(current_paragraphs),
                "word_count": current_word_count,
                "start_paragraph_index": start_idx,
                "end_paragraph_index": len(paragraphs) - 1,
            }
        )

    return chunks


def _estimate_time_offsets(chunk_index: int, total_chunks: int, total_words: int) -> Dict[str, str]:
    """
    Produce rough start/end time estimates for a chunk assuming ~150 wpm speech.
    Returns ISO-8601 duration-like strings (e.g. "00:10:00").
    """
    wpm = 150
    minutes_per_word = 1 / wpm
    words_per_chunk = total_words / max(total_chunks, 1)

    start_minutes = int(chunk_index * words_per_chunk * minutes_per_word)
    end_minutes = int((chunk_index + 1) * words_per_chunk * minutes_per_word)

    def _fmt(m: int) -> str:
        h = m // 60
        m %= 60
        return f"{h:02d}:{m:02d}:00"

    return {"start_time_estimate": _fmt(start_minutes), "end_time_estimate": _fmt(end_minutes)}


# ---------------------------------------------------------------------------
# NLP-lite helpers (used by fallback & merge dedup)
# ---------------------------------------------------------------------------


def _extract_keywords(text: str, top_n: int = 10) -> List[str]:
    """
    Very lightweight keyword extraction:
    - lowercase, strip punctuation
    - remove common English stopwords
    - return top_n most frequent content words (length >= 4)
    """
    stop_words = {
        "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
        "her", "was", "one", "our", "out", "has", "have", "been", "were",
        "they", "this", "that", "with", "from", "what", "when", "where",
        "which", "who", "will", "each", "about", "after", "before", "into",
        "through", "during", "their", "there", "these", "those", "some",
        "other", "than", "then", "them", "its", "also", "just", "like",
        "would", "could", "should", "very", "much", "more", "most",
    }
    words = re.findall(r"[a-z]{4,}", text.lower())
    filtered = [w for w in words if w not in stop_words]
    return [w for w, _ in Counter(filtered).most_common(top_n)]


def _jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


# ---------------------------------------------------------------------------
# Node schema builders
# ---------------------------------------------------------------------------


def _build_node(
    label: str,
    node_type: str,
    description: str = "",
    key_points: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    source_chunk: int = 0,
    confidence: float = 0.85,
    children: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Canonical node builder enforcing the enriched schema."""
    assert node_type in NODE_TYPE_VALUES, f"Invalid node_type '{node_type}'"
    return {
        "label": label.strip(),
        "type": node_type,
        "description": description.strip(),
        "keyPoints": key_points or [],
        "tags": tags or [],
        "sourceChunk": source_chunk,
        "confidence": round(min(max(confidence, 0.0), 1.0), 2),
        "children": children or [],
    }


def _normalize_llm_mindmap(raw: Dict[str, Any], source_chunk: int) -> Dict[str, Any]:
    """
    Accept the raw JSON returned by the LLM and coerce it into the enriched
    node schema.  Handles both flat and deeply-nested structures.
    """

    def _recurse(item: Any, depth: int) -> Dict[str, Any]:
        if not isinstance(item, dict):
            return _build_node(str(item), "detail", source_chunk=source_chunk, confidence=0.6)

        label = item.get("label") or item.get("name") or item.get("title") or "Untitled"
        node_type = item.get("type", "topic")
        if node_type not in NODE_TYPE_VALUES:
            # Heuristic: depth 0 → topic, deeper → subtopic/detail
            node_type = "topic" if depth <= 1 else "subtopic"

        description = item.get("description", "")
        key_points = item.get("keyPoints", item.get("key_points", []))
        tags = item.get("tags", [])
        confidence = item.get("confidence", 0.85)

        raw_children = item.get("children", [])
        if isinstance(raw_children, list):
            child_nodes = [_recurse(c, depth + 1) for c in raw_children if c]
        else:
            child_nodes = []

        return _build_node(
            label=str(label),
            node_type=node_type,
            description=str(description),
            key_points=[str(p) for p in key_points],
            tags=[str(t) for t in tags],
            source_chunk=source_chunk,
            confidence=float(confidence),
            children=child_nodes,
        )

    # The LLM may return {"root": "...", "children": [...]} or a single node.
    if "root" in raw:
        root_label = str(raw["root"])
        raw_children = raw.get("children", [])
        if isinstance(raw_children, list):
            children = [_recurse(c, 1) for c in raw_children]
        else:
            children = []
        return _build_node(
            label=root_label,
            node_type="root",
            description=raw.get("description", f"Root topic: {root_label}"),
            source_chunk=source_chunk,
            confidence=0.9,
            children=children,
        )

    # Already a single node object.
    return _recurse(raw, 0)


# ---------------------------------------------------------------------------
# Merge logic
# ---------------------------------------------------------------------------

DEDUP_SIMILARITY_THRESHOLD = 0.6


def _collect_all_tags(node: Dict[str, Any]) -> set:
    tags: set = set(node.get("tags", []))
    for child in node.get("children", []):
        tags |= _collect_all_tags(child)
    return tags


def _labels_in_tree(node: Dict[str, Any]) -> set:
    labels = {node["label"].lower()}
    for child in node.get("children", []):
        labels |= _labels_in_tree(child)
    return labels


def _merge_nodes_similar(node_a: Dict[str, Any], node_b: Dict[str, Any]) -> Dict[str, Any]:
    """Merge two similar nodes: combine keyPoints, tags, and merge children."""
    merged_key_points = list(dict.fromkeys(node_a.get("keyPoints", []) + node_b.get("keyPoints", [])))
    merged_tags = list(set(node_a.get("tags", []) + node_b.get("tags", [])))
    merged_children = node_a.get("children", []) + node_b.get("children", [])
    merged_confidence = max(node_a.get("confidence", 0), node_b.get("confidence", 0))
    merged_desc = node_a.get("description", "") or node_b.get("description", "")

    return _build_node(
        label=node_a["label"],
        node_type=node_a["type"],
        description=merged_desc,
        key_points=merged_key_points,
        tags=merged_tags,
        source_chunk=min(node_a.get("sourceChunk", 0), node_b.get("sourceChunk", 0)),
        confidence=merged_confidence,
        children=merged_children,
    )


def _try_dedup_children(children: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicate a list of sibling nodes by label/tag similarity.
    Returns a deduplicated list.
    """
    if len(children) <= 1:
        return children

    kept: List[Dict[str, Any]] = []
    merged_indices: set = set()

    for i, child_a in enumerate(children):
        if i in merged_indices:
            continue
        for j, child_b in enumerate(children[i + 1 :], start=i + 1):
            if j in merged_indices:
                continue
            sim = _jaccard_similarity(
                set(_extract_keywords(child_a["label"])),
                set(_extract_keywords(child_b["label"])),
            )
            if sim >= DEDUP_SIMILARITY_THRESHOLD:
                children[i] = _merge_nodes_similar(child_a, child_b)
                merged_indices.add(j)
        kept.append(children[i])

    # Recurse into children.
    for node in kept:
        if node.get("children"):
            node["children"] = _try_dedup_children(node["children"])

    return kept


def _build_summary_root(chunk_mindmaps: List[Dict[str, Any]], total_words: int) -> Dict[str, Any]:
    """
    Build a high-level summary root that connects major themes from all chunks.
    Each chunk's top-level nodes become children of the summary.
    """
    summary_label = "Meeting Summary"
    all_tags: set = set()
    dominant_topics: List[str] = []

    summary_children: List[Dict[str, Any]] = []
    for idx, mm in enumerate(chunk_mindmaps):
        # Deduplicate within each chunk's mindmap first.
        mm_children = mm.get("children", [])
        mm_children = _try_dedup_children(mm_children)

        # Collect metadata.
        chunk_tags = _collect_all_tags(mm)
        all_tags |= chunk_tags
        if mm.get("label"):
            dominant_topics.append(mm["label"])

        # Wrap this chunk's mindmap under a topic node.
        chunk_wrapper = _build_node(
            label=mm.get("label", f"Segment {idx + 1}"),
            node_type="topic",
            description=f"Key topics from transcript segment {idx + 1}",
            tags=list(chunk_tags)[:10],
            source_chunk=idx,
            confidence=mm.get("confidence", 0.85),
            children=mm_children,
        )
        summary_children.append(chunk_wrapper)

    summary_children = _try_dedup_children(summary_children)

    # Attempt to merge very similar top-level chunk wrappers.
    if len(summary_children) > 1:
        summary_children = _try_dedup_children(summary_children)

    return _build_node(
        label=summary_label,
        node_type="root",
        description=f"Auto-generated meeting summary covering {total_words} words across {len(chunk_mindmaps)} segments.",
        tags=list(all_tags)[:20],
        source_chunk=-1,
        confidence=0.8,
        children=summary_children,
    )


# ---------------------------------------------------------------------------
# LLM-based per-chunk mindmap generation
# ---------------------------------------------------------------------------

CHUNK_SYSTEM_PROMPT = """You are an expert meeting analyst. You extract key concepts from meeting transcripts and structure them into a detailed, editable mindmap.

Given a transcript segment, analyze it and produce a hierarchical mindmap JSON.

IMPORTANT: Each node MUST follow this exact schema:
{
  "label": "Concise node title (max 8 words)",
  "type": "root|topic|subtopic|detail|action_item|decision",
  "description": "1-2 sentence summary of what this node covers",
  "keyPoints": ["specific point 1", "specific point 2"],
  "tags": ["relevant", "keywords"],
  "confidence": 0.85,
  "children": [ ... same schema recursively ... ]
}

Rules:
1. Identify the main topic as the root node (type: "root").
2. Extract 3-7 main branches (type: "topic").
3. Each topic can have 2-5 sub-branches (type: "subtopic" or "detail").
4. Mark explicit action items with type "action_item".
5. Mark explicit decisions with type "decision".
6. Include meaningful keyPoints for each node (2-4 bullet points).
7. Include relevant tags (2-5 tags).
8. Set confidence between 0.0 and 1.0 based on how clear the signal is.
9. Return ONLY valid JSON — no markdown fences, no explanation.
10. The top-level object must have "label", "type", "description", "keyPoints", "tags", "confidence", "children".

Focus on important concepts, decisions, and action items. Avoid trivial details."""


def _extract_json_payload(text: str) -> str:
    """Extract JSON payload from plain text or markdown fenced output."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    return cleaned


def _parse_llm_json_response(response_text: str, chunk_index: int) -> Dict[str, Any]:
    """Parse JSON returned by LLM; attempt repair for malformed outputs."""
    payload = _extract_json_payload(response_text)
    if not payload:
        raise ValueError(f"Empty response from LLM for chunk {chunk_index}")

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as parse_err:
        logger.warning(
            "Direct JSON parse failed for chunk %s (%s). Attempting JSON repair.",
            chunk_index,
            parse_err,
        )
        try:
            repaired = repair_json(payload)
            parsed = repaired if isinstance(repaired, dict) else json.loads(repaired)
        except Exception as repair_err:
            preview = payload[:200].replace("\n", " ")
            logger.error(
                "Failed to repair/parse LLM mindmap JSON for chunk %s: %s. Payload preview: %s",
                chunk_index,
                repair_err,
                preview,
            )
            raise ValueError(f"Invalid JSON from LLM for chunk {chunk_index}") from repair_err

    if not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object from LLM for chunk {chunk_index}, got {type(parsed).__name__}")

    return parsed


async def _generate_chunk_mindmap_llm(chunk_text: str, chunk_index: int) -> Dict[str, Any]:
    """Call Mistral chat completions API to produce an enriched mindmap for a single chunk."""
    if not MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY is not configured")

    user_prompt = f"Transcript segment {chunk_index}:\n\n{chunk_text}"
    last_error: Optional[Exception] = None

    for model_name in MINDMAP_MODELS:
        try:
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": CHUNK_SYSTEM_PROMPT + "\n\n" + user_prompt,
                    },
                ],
                "temperature": 0.5,
                "response_format": {"type": "json_object"},
            }
            headers = {
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=90.0) as client:
                resp = await client.post(MISTRAL_CHAT_API_URL, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                response_text = data["choices"][0]["message"]["content"]

            raw = _parse_llm_json_response(response_text, chunk_index)

            if model_name != MINDMAP_PRIMARY_MODEL:
                logger.info(
                    "Mindmap chunk %s generated with fallback model %s",
                    chunk_index,
                    model_name,
                )

            return _normalize_llm_mindmap(raw, source_chunk=chunk_index)
        except Exception as e:
            last_error = e
            logger.warning(
                "Mindmap model %s failed for chunk %s: %s",
                model_name,
                chunk_index,
                e,
            )

    raise ValueError(
        f"All configured mindmap models failed for chunk {chunk_index}"
    ) from last_error


# ---------------------------------------------------------------------------
# Fallback mindmap (NLP-lite)
# ---------------------------------------------------------------------------


def _generate_fallback_mindmap_enriched(chunk_text: str, chunk_index: int) -> Dict[str, Any]:
    """
    NLP-lite fallback: extract sentences, group by keyword similarity,
    and produce an enriched mindmap node tree.
    """
    sentences = [
        s.strip()
        for s in SENTENCE_BOUNDARY.split(chunk_text.replace("! ", ". ").replace("? ", ". "))
        if s.strip() and len(s.strip()) > 15
    ]

    if not sentences:
        return _build_node(
            label="Empty Segment",
            node_type="root",
            description="No meaningful content found in this segment.",
            source_chunk=chunk_index,
            confidence=0.3,
        )

    # Extract dominant keywords across the whole chunk.
    all_keywords = _extract_keywords(chunk_text, top_n=15)
    chunk_keywords = set(all_keywords)

    # Group sentences by their strongest matching keyword.
    topic_buckets: Dict[str, List[str]] = {}
    unassigned: List[str] = []

    for sent in sentences:
        sent_words = set(_extract_keywords(sent, top_n=5))
        best_kw = None
        best_score = 0
        for kw in chunk_keywords:
            if kw in sent.lower():
                score = len(kw)  # longer keyword → more specific
                if score > best_score:
                    best_score = score
                    best_kw = kw
        if best_kw:
            topic_buckets.setdefault(best_kw, []).append(sent)
        else:
            unassigned.append(sent)

    # Build the tree.
    topic_nodes: List[Dict[str, Any]] = []
    for kw, bucket_sents in topic_buckets.items():
        child_nodes = [
            _build_node(
                label=sent[:100],
                node_type="detail",
                description=sent,
                key_points=[sent],
                tags=[kw],
                source_chunk=chunk_index,
                confidence=0.6,
            )
            for sent in bucket_sents[:5]  # cap children per topic
        ]
        topic_nodes.append(
            _build_node(
                label=kw.replace("_", " ").title(),
                node_type="topic",
                description=f"Key theme: {kw}",
                key_points=[s[:120] for s in bucket_sents[:3]],
                tags=[kw],
                source_chunk=chunk_index,
                confidence=0.65,
                children=child_nodes,
            )
        )

    # Put unassigned sentences under a "Miscellaneous" bucket.
    if unassigned:
        misc_children = [
            _build_node(
                label=sent[:100],
                node_type="detail",
                description=sent,
                source_chunk=chunk_index,
                confidence=0.4,
            )
            for sent in unassigned[:8]
        ]
        topic_nodes.append(
            _build_node(
                label="Other Points",
                node_type="topic",
                description="Miscellaneous points that didn't cluster strongly.",
                source_chunk=chunk_index,
                confidence=0.5,
                children=misc_children,
            )
        )

    # Derive a root label from the most frequent keywords.
    root_label = "Meeting Segment"
    if all_keywords:
        root_label = f"Meeting Segment: {', '.join(all_keywords[:3]).replace('_', ' ').title()}"

    return _build_node(
        label=root_label,
        node_type="root",
        description=f"Auto-extracted mindmap for segment {chunk_index} ({_count_words(chunk_text)} words).",
        tags=all_keywords[:10],
        source_chunk=chunk_index,
        confidence=0.6,
        children=topic_nodes,
    )


def generate_fallback_mindmap(transcript: str) -> Dict[str, Any]:
    """
    Backwards-compatible fallback that produces the enriched schema for the
    entire transcript in one shot (used when chunking is not desired).
    """
    return _generate_fallback_mindmap_enriched(transcript, chunk_index=0)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe an audio file using Mistral transcription API.
    Returns the transcribed text.
    """
    if not MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY is not configured")

    headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}"}

    with open(file_path, "rb") as file:
        files = {"file": (os.path.basename(file_path), file, "application/octet-stream")}
        data = {"model": TRANSCRIPTION_MODEL}

        with httpx.Client(timeout=180.0) as client:
            resp = client.post(MISTRAL_TRANSCRIBE_API_URL, headers=headers, data=data, files=files)
            resp.raise_for_status()
            payload = resp.json()

    transcript = payload.get("text") or payload.get("transcript") or ""
    if not transcript:
        raise ValueError("Mistral transcription response did not include transcript text")
    return str(transcript)


async def generate_mindmap_from_transcript(transcript: str) -> Dict[str, Any]:
    """
    Generate an enriched, editable mindmap from a full meeting transcript.

    Pipeline:
    1. Chunk the transcript into ~1500-2000 word segments.
    2. For each chunk, call the LLM to produce a detailed mindmap.
    3. Merge all chunk mindmaps: deduplicate, cross-reference, build summary.
    4. Return the unified output in schema version 2.0 format.

    If LLM calls fail for individual chunks, those chunks fall back to the
    NLP-lite method automatically.

    Returns:
    {
        "version": "2.0",
        "metadata": { ... },
        "summary": { enriched root node with children },
        "chunks": [ { index, wordCount, dominantTopic, mindmap, timeEstimates } ],
        "editableNotes": "..."
    }
    """
    total_words = _count_words(transcript)
    chunks = _chunk_transcript(transcript)

    if not chunks:
        # Edge case: empty or near-empty transcript.
        fallback = _generate_fallback_mindmap_enriched(transcript, chunk_index=0)
        return {
            "version": OUTPUT_SCHEMA_VERSION,
            "metadata": {
                "totalChunks": 0,
                "totalWords": total_words,
                "dominantTopics": [],
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            },
            "summary": fallback,
            "chunks": [],
            "editableNotes": "Transcript was too short to chunk. The summary contains the best-effort extraction.",
        }

    # --- Step 2: per-chunk mindmap generation ---
    chunk_results: List[Dict[str, Any]] = []
    chunk_mindmaps: List[Dict[str, Any]] = []
    llm_failures = 0

    for idx, chunk_info in enumerate(chunks):
        chunk_text = chunk_info["text"]
        word_count = chunk_info["word_count"]
        time_estimates = _estimate_time_offsets(idx, len(chunks), total_words)

        try:
            mindmap = await _generate_chunk_mindmap_llm(chunk_text, chunk_index=idx)
        except Exception as e:
            logger.warning(
                f"LLM mindmap generation failed for chunk {idx} ({word_count} words), "
                f"falling back to NLP-lite: {e}"
            )
            mindmap = _generate_fallback_mindmap_enriched(chunk_text, chunk_index=idx)
            llm_failures += 1

        dominant_topic = mindmap.get("label", f"Segment {idx + 1}")
        chunk_result = {
            "index": idx,
            "wordCount": word_count,
            "dominantTopic": dominant_topic,
            "mindmap": mindmap,
            "timeEstimates": time_estimates,
        }
        chunk_results.append(chunk_result)
        chunk_mindmaps.append(mindmap)

    # --- Step 3: merge into unified summary ---
    summary = _build_summary_root(chunk_mindmaps, total_words)

    # --- Step 4: derive dominant topics for metadata ---
    all_dominant = [cr["dominantTopic"] for cr in chunk_results]
    all_tags_set: set = _collect_all_tags(summary)
    dominant_topics_list = [t for t in all_dominant if t]

    # --- Editable notes ---
    notes_parts: List[str] = []
    if llm_failures > 0:
        notes_parts.append(
            f"{llm_failures} segment(s) failed LLM generation and used NLP-lite fallback. "
            "Review those segments for reduced confidence."
        )
    if len(chunks) > 5:
        notes_parts.append(
            "Transcript was split into many segments. Consider reviewing cross-segment "
            "connections manually for coherence."
        )
    notes_parts.append(
        "Nodes can be edited directly in the JSON. "
        "Changing 'confidence' or adding tags helps track manual refinements."
    )

    return {
        "version": OUTPUT_SCHEMA_VERSION,
        "metadata": {
            "totalChunks": len(chunk_results),
            "totalWords": total_words,
            "dominantTopics": dominant_topics_list,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        },
        "summary": summary,
        "chunks": chunk_results,
        "editableNotes": " ".join(notes_parts),
    }
