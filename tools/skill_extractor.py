"""
skill_extractor.py — Skill Extraction (Layer 3 Tool)
Extracts technical and soft skills from text using a curated taxonomy.
Deterministic, regex-based word-boundary matching — no LLM in path.
"""

import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from app.config import SKILL_TAXONOMY_PATH


@dataclass
class SkillExtractionResult:
    success: bool = False
    skills: list[str] = field(default_factory=list)
    skill_categories: dict[str, list[str]] = field(default_factory=dict)
    total_count: int = 0
    processing_time_ms: float = 0.0
    error_message: str | None = None


# ── Taxonomy Cache ───────────────────────────────────

_taxonomy_cache: dict | None = None


def _load_taxonomy(path: str | Path | None = None) -> dict:
    """Load and cache the skill taxonomy JSON."""
    global _taxonomy_cache
    if _taxonomy_cache is not None:
        return _taxonomy_cache

    taxonomy_path = Path(path) if path else SKILL_TAXONOMY_PATH
    if not taxonomy_path.exists():
        raise FileNotFoundError(f"Taxonomy not found: {taxonomy_path}")

    with open(taxonomy_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _taxonomy_cache = data
    return data


# ── Public API ───────────────────────────────────────

def extract_skills(
    text: str,
    taxonomy_path: str | Path | None = None,
) -> SkillExtractionResult:
    """
    Extract skills from text using the taxonomy.

    Args:
        text: Plain text (resume or JD).
        taxonomy_path: Optional path to taxonomy JSON.

    Returns:
        SkillExtractionResult with matched skills and categories.
    """
    start = time.perf_counter()

    # Empty text is valid — returns empty skills
    if not text or not text.strip():
        return SkillExtractionResult(
            success=True,
            processing_time_ms=_elapsed(start),
        )

    try:
        taxonomy = _load_taxonomy(taxonomy_path)
    except FileNotFoundError as exc:
        return SkillExtractionResult(
            error_message=str(exc),
            processing_time_ms=_elapsed(start),
        )
    except json.JSONDecodeError as exc:
        return SkillExtractionResult(
            error_message=f"Invalid taxonomy: {exc}",
            processing_time_ms=_elapsed(start),
        )

    text_lower = text.lower()
    matched_skills: list[str] = []
    categories: dict[str, list[str]] = {}

    for category, skills_map in taxonomy.items():
        cat_matches: list[str] = []

        for canonical_name, aliases in skills_map.items():
            if _match_any_alias(text_lower, aliases):
                if canonical_name not in matched_skills:
                    matched_skills.append(canonical_name)
                    cat_matches.append(canonical_name)

        if cat_matches:
            categories[category] = cat_matches

    return SkillExtractionResult(
        success=True,
        skills=matched_skills,
        skill_categories=categories,
        total_count=len(matched_skills),
        processing_time_ms=_elapsed(start),
    )


# ── Matching Helpers ─────────────────────────────────

def _match_any_alias(text_lower: str, aliases: list[str]) -> bool:
    """Check if any alias matches in the text using word-boundary regex."""
    for alias in aliases:
        try:
            # Handle special regex patterns stored in taxonomy (e.g., "\\br\\b")
            if alias.startswith("\\b"):
                pattern = alias
            else:
                # Escape regex special chars, then wrap with word boundaries
                escaped = re.escape(alias.lower())
                pattern = rf"\b{escaped}\b"

            if re.search(pattern, text_lower):
                return True
        except re.error:
            # Skip broken patterns silently
            continue
    return False


def _elapsed(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)
