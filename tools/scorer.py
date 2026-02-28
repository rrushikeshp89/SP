"""
scorer.py — Fit Score Computation (Layer 3 Tool)
Computes a weighted composite score for resume-to-JD matching.
Formula: 0.40×semantic + 0.35×skills + 0.15×experience + 0.10×education
"""

import time
import re
from dataclasses import dataclass, field

import numpy as np
from scipy.spatial.distance import cosine as cosine_distance  # type: ignore[import-untyped]

from app.config import (
    WEIGHT_SEMANTIC,
    WEIGHT_SKILLS,
    WEIGHT_EXPERIENCE,
    WEIGHT_EDUCATION,
)


# ── Dataclasses ──────────────────────────────────────

@dataclass
class ComponentScore:
    score: float = 0.0
    weight: float = 0.0
    weighted_score: float = 0.0


@dataclass
class ScoreBreakdown:
    semantic: ComponentScore = field(default_factory=ComponentScore)
    skills: ComponentScore = field(default_factory=ComponentScore)
    experience: ComponentScore = field(default_factory=ComponentScore)
    education: ComponentScore = field(default_factory=ComponentScore)


# ── Degree Hierarchy ─────────────────────────────────

DEGREE_LEVELS = {
    "high_school": 1,
    "high school": 1,
    "associate": 2,
    "bachelor": 3,
    "bachelors": 3,
    "master": 4,
    "masters": 4,
    "phd": 5,
    "doctorate": 5,
}


# ── Public API ───────────────────────────────────────

def compute_fit_score(resume: dict, job: dict) -> dict:
    """
    Compute the fit score between a resume and a job description.

    Args:
        resume: Resume record dict (must have embedding_vector, skills, etc.)
        job: Job record dict (must have embedding_vector, required_skills, etc.)

    Returns:
        Dict with fit_score, breakdown, matched_skills, missing_skills, suggestions.
    """
    start = time.perf_counter()

    resume_vec = resume.get("embedding_vector", [])
    jd_vec = job.get("embedding_vector", [])
    resume_skills = [s.lower() for s in (resume.get("skills") or [])]
    jd_required = [s.lower() for s in (job.get("required_skills") or [])]
    jd_preferred = [s.lower() for s in (job.get("preferred_skills") or [])]

    resume_exp_years = resume.get("experience_years")
    jd_min_exp = job.get("experience_years")
    resume_edu = resume.get("education")
    jd_edu = job.get("education")

    # ── 1. Semantic Similarity ──
    sem_score = _semantic_score(resume_vec, jd_vec)
    semantic = ComponentScore(
        score=sem_score,
        weight=WEIGHT_SEMANTIC,
        weighted_score=round(sem_score * WEIGHT_SEMANTIC, 2),
    )

    # ── 2. Skill Match ──
    skills_score, matched, missing, partial = _skills_score(resume_skills, jd_required)
    preferred_bonus = _preferred_bonus(resume_skills, jd_preferred)
    skills_score = min(100.0, skills_score + preferred_bonus)

    skills_comp = ComponentScore(
        score=skills_score,
        weight=WEIGHT_SKILLS,
        weighted_score=round(skills_score * WEIGHT_SKILLS, 2),
    )

    # ── 3. Experience ──
    exp_score = _experience_score(resume_exp_years, jd_min_exp)
    experience = ComponentScore(
        score=exp_score,
        weight=WEIGHT_EXPERIENCE,
        weighted_score=round(exp_score * WEIGHT_EXPERIENCE, 2),
    )

    # ── 4. Education ──
    edu_score = _education_score(resume_edu, jd_edu)
    education = ComponentScore(
        score=edu_score,
        weight=WEIGHT_EDUCATION,
        weighted_score=round(edu_score * WEIGHT_EDUCATION, 2),
    )

    # ── Final Score ──
    raw_total = (
        semantic.weighted_score
        + skills_comp.weighted_score
        + experience.weighted_score
        + education.weighted_score
    )
    fit_score = round(max(0.0, min(100.0, raw_total)), 2)

    # ── Suggestions ──
    suggestions = _generate_suggestions(
        missing, resume_exp_years, jd_min_exp,
        resume_edu, jd_edu, fit_score, matched,
    )

    elapsed = round((time.perf_counter() - start) * 1000, 2)

    return {
        "fit_score": fit_score,
        "breakdown": {
            "semantic": {"score": semantic.score, "weight": semantic.weight, "weighted_score": semantic.weighted_score},
            "skills": {"score": skills_comp.score, "weight": skills_comp.weight, "weighted_score": skills_comp.weighted_score},
            "experience": {"score": experience.score, "weight": experience.weight, "weighted_score": experience.weighted_score},
            "education": {"score": education.score, "weight": education.weight, "weighted_score": education.weighted_score},
        },
        "matched_skills": matched,
        "missing_skills": missing,
        "partially_matched": partial,
        "suggestions": suggestions,
        "processing_time_ms": elapsed,
    }


# ── Component Scorers ────────────────────────────────

def _semantic_score(resume_vec: list[float], jd_vec: list[float]) -> float:
    """Cosine similarity × 100. Returns 50 if vectors missing."""
    if not resume_vec or not jd_vec:
        return 50.0
    try:
        a = np.array(resume_vec, dtype=np.float32)
        b = np.array(jd_vec, dtype=np.float32)
        sim = 1.0 - cosine_distance(a, b)
        return round(max(0.0, min(100.0, sim * 100)), 2)
    except Exception:
        return 50.0


def _skills_score(
    resume_skills: list[str],
    jd_required: list[str],
) -> tuple[float, list[str], list[str], list[dict]]:
    """Score skill overlap. Returns (score, matched, missing, partial)."""
    if not jd_required:
        return 100.0, [], [], []

    matched: list[str] = []
    missing: list[str] = []
    partial: list[dict] = []
    total_credit = 0.0

    for req in jd_required:
        # Exact match
        if req in resume_skills:
            matched.append(req)
            total_credit += 1.0
            continue

        # Fuzzy match (simple containment heuristic)
        best_sim = 0.0
        best_match = ""
        for rs in resume_skills:
            sim = _simple_similarity(req, rs)
            if sim > best_sim:
                best_sim = sim
                best_match = rs

        if best_sim >= 0.85:
            partial.append({"required": req, "has": best_match, "similarity": round(best_sim, 2)})
            total_credit += 0.7
        elif best_sim >= 0.65:
            partial.append({"required": req, "has": best_match, "similarity": round(best_sim, 2)})
            total_credit += 0.4
        else:
            missing.append(req)

    score = round((total_credit / len(jd_required)) * 100, 2)
    return score, matched, missing, partial


def _preferred_bonus(resume_skills: list[str], preferred: list[str]) -> float:
    """Up to 5 bonus points for preferred skills."""
    if not preferred:
        return 0.0
    count = sum(1 for ps in preferred if ps in resume_skills)
    return min(5.0, (count / len(preferred)) * 5.0)


def _experience_score(resume_years: float | None, jd_min_years: float | None) -> float:
    """Score based on years of experience."""
    if resume_years is None or jd_min_years is None:
        return 50.0
    if jd_min_years <= 0:
        return 100.0

    if resume_years >= jd_min_years:
        return min(100.0, 80.0 + (resume_years - jd_min_years) * 4.0)
    else:
        ratio = resume_years / jd_min_years
        return round(ratio * 80.0, 2)


def _education_score(resume_edu: dict | None, jd_edu: dict | None) -> float:
    """Score based on degree level and field match."""
    if not resume_edu or not jd_edu:
        return 50.0

    score = 0.0

    # Degree level (50 pts)
    r_level = DEGREE_LEVELS.get(str(resume_edu.get("degree", "")).lower(), 0)
    j_level = DEGREE_LEVELS.get(str(jd_edu.get("degree_level", jd_edu.get("degree", ""))).lower(), 0)

    if r_level == 0 or j_level == 0:
        score += 25.0  # partial credit when data missing
    elif r_level >= j_level:
        score += 50.0
    elif r_level == j_level - 1:
        score += 30.0
    else:
        score += 10.0

    # Field match (50 pts)
    r_field = str(resume_edu.get("field", "")).lower()
    j_field = str(jd_edu.get("field", "")).lower()

    if not r_field or not j_field:
        score += 25.0
    elif r_field == j_field:
        score += 50.0
    elif _is_related_field(r_field, j_field):
        score += 30.0
    else:
        score += 10.0

    return round(score, 2)


# ── Helpers ──────────────────────────────────────────

_STEM_FIELDS = {
    "computer science", "software engineering", "information technology",
    "data science", "mathematics", "statistics", "physics", "engineering",
    "electrical engineering", "mechanical engineering", "chemical engineering",
}


def _is_related_field(f1: str, f2: str) -> bool:
    """Check if two fields are in the same broad category (e.g., STEM)."""
    return f1 in _STEM_FIELDS and f2 in _STEM_FIELDS


def _simple_similarity(a: str, b: str) -> float:
    """Quick string similarity using character overlap (Dice coefficient)."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    bigrams_a = set(_bigrams(a))
    bigrams_b = set(_bigrams(b))
    if not bigrams_a or not bigrams_b:
        return 0.0
    return 2 * len(bigrams_a & bigrams_b) / (len(bigrams_a) + len(bigrams_b))


def _bigrams(s: str) -> list[str]:
    return [s[i:i+2] for i in range(len(s) - 1)]


def _generate_suggestions(
    missing: list[str],
    resume_years: float | None,
    jd_min_years: float | None,
    resume_edu: dict | None,
    jd_edu: dict | None,
    fit_score: float,
    matched: list[str],
) -> list[str]:
    """Generate deterministic improvement suggestions (max 5)."""
    suggestions: list[str] = []

    # Missing skills
    for skill in missing[:3]:
        suggestions.append(f"Consider gaining experience in {skill}")

    # Experience gap
    if resume_years is not None and jd_min_years is not None:
        if resume_years < jd_min_years:
            suggestions.append(
                f"The role requires {jd_min_years:.0f} years of experience; "
                f"you have {resume_years:.0f}"
            )

    # Education gap
    if resume_edu and jd_edu:
        r_level = DEGREE_LEVELS.get(str(resume_edu.get("degree", "")).lower(), 0)
        j_level = DEGREE_LEVELS.get(
            str(jd_edu.get("degree_level", jd_edu.get("degree", ""))).lower(), 0
        )
        if 0 < r_level < j_level:
            target = next(
                (k for k, v in DEGREE_LEVELS.items() if v == j_level),
                "higher",
            )
            suggestions.append(f"Consider pursuing a {target} degree")

    # Strong match encouragement
    if fit_score > 80 and matched:
        top = ", ".join(matched[:3])
        suggestions.append(f"Strong match — highlight your skills in {top}")

    return suggestions[:5]
