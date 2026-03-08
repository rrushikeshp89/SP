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

def compute_fit_score(resume: dict, job: dict, custom_weights: dict | None = None) -> dict:
    """
    Compute the fit score between a resume and a job description.

    Args:
        resume: Resume record dict (must have embedding_vector, skills, etc.)
        job: Job record dict (must have embedding_vector, required_skills, etc.)
        custom_weights: Optional dict with keys semantic/skills/experience/education.

    Returns:
        Dict with fit_score, breakdown, matched_skills, missing_skills,
        suggestions, explanation, gap_report.
    """
    start = time.perf_counter()

    # Use custom weights if provided, else defaults
    w_semantic = custom_weights.get("semantic", WEIGHT_SEMANTIC) if custom_weights else WEIGHT_SEMANTIC
    w_skills = custom_weights.get("skills", WEIGHT_SKILLS) if custom_weights else WEIGHT_SKILLS
    w_experience = custom_weights.get("experience", WEIGHT_EXPERIENCE) if custom_weights else WEIGHT_EXPERIENCE
    w_education = custom_weights.get("education", WEIGHT_EDUCATION) if custom_weights else WEIGHT_EDUCATION

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
        weight=w_semantic,
        weighted_score=round(sem_score * w_semantic, 2),
    )

    # ── 2. Skill Match ──
    skills_score, matched, missing, partial = _skills_score(resume_skills, jd_required)
    preferred_bonus = _preferred_bonus(resume_skills, jd_preferred)
    skills_score = min(100.0, skills_score + preferred_bonus)

    skills_comp = ComponentScore(
        score=skills_score,
        weight=w_skills,
        weighted_score=round(skills_score * w_skills, 2),
    )

    # ── 3. Experience ──
    exp_score = _experience_score(resume_exp_years, jd_min_exp)
    experience = ComponentScore(
        score=exp_score,
        weight=w_experience,
        weighted_score=round(exp_score * w_experience, 2),
    )

    # ── 4. Education ──
    edu_score = _education_score(resume_edu, jd_edu)
    education = ComponentScore(
        score=edu_score,
        weight=w_education,
        weighted_score=round(edu_score * w_education, 2),
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

    result = {
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

    # Generate natural-language explanation and gap report
    result["explanation"] = generate_explanation(result, resume, job)
    result["gap_report"] = generate_gap_report(result, resume, job)

    return result


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


# ── Natural Language Explanation ─────────────────────

def generate_explanation(result: dict, resume: dict, job: dict) -> str:
    """Generate a 2-3 sentence human-readable score explanation."""
    score = result["fit_score"]
    matched = result.get("matched_skills", [])
    missing = result.get("missing_skills", [])
    breakdown = result["breakdown"]

    # Strength qualifier
    if score >= 85:
        strength = "an excellent"
    elif score >= 70:
        strength = "a strong"
    elif score >= 55:
        strength = "a moderate"
    elif score >= 40:
        strength = "a fair"
    else:
        strength = "a weak"

    candidate = resume.get("candidate_name", "This candidate")
    job_title = job.get("title", "this position")

    parts = [f"{candidate} is {strength} match for {job_title} with an overall fit score of {score:.0f}%."]

    # Skills insight
    if matched:
        top_skills = matched[:5]
        parts.append(f"Key matching skills include {', '.join(top_skills)}.")

    # Best and weakest component
    components = {
        "Semantic relevance": breakdown["semantic"]["score"],
        "Skills alignment": breakdown["skills"]["score"],
        "Experience level": breakdown["experience"]["score"],
        "Education fit": breakdown["education"]["score"],
    }
    best_name = max(components, key=lambda k: components[k])
    best_val = components[best_name]
    worst_name = min(components, key=lambda k: components[k])
    worst_val = components[worst_name]

    if best_val > 75:
        parts.append(f"{best_name} is particularly strong at {best_val:.0f}%.")
    if worst_val < 40 and missing:
        gap_items = ", ".join(missing[:3])
        parts.append(f"Primary gaps: {gap_items}.")
    elif missing:
        parts.append(f"{worst_name} could be improved ({worst_val:.0f}%).")

    return " ".join(parts)


# ── Skill Gap Report ─────────────────────────────────

def generate_gap_report(result: dict, resume: dict, job: dict) -> list[dict]:
    """Generate actionable gap analysis items."""
    gaps: list[dict] = []

    # Skill gaps
    for skill in result.get("missing_skills", []):
        gaps.append({
            "category": "skill",
            "item": skill,
            "impact": "high",
            "recommendation": f"Acquire {skill} through certification or project experience",
        })

    # Partial match gaps
    for pm in result.get("partially_matched", []):
        if pm.get("similarity", 0) < 0.8:
            gaps.append({
                "category": "skill",
                "item": pm["required"],
                "impact": "medium",
                "recommendation": f"Strengthen {pm['required']} — has related skill '{pm['has']}'",
            })

    # Experience gap
    resume_exp = resume.get("experience_years")
    job_exp = job.get("experience_years")
    if resume_exp is not None and job_exp is not None and resume_exp < job_exp:
        gap_years = job_exp - resume_exp
        gaps.append({
            "category": "experience",
            "item": f"{gap_years:.0f} more year{'s' if gap_years != 1 else ''}",
            "impact": "medium",
            "recommendation": f"Candidate has {resume_exp:.0f}yr experience; role requires {job_exp:.0f}yr",
        })

    # Education gap
    resume_edu = resume.get("education")
    job_edu = job.get("education")
    if resume_edu and job_edu:
        r_level = DEGREE_LEVELS.get(str(resume_edu.get("degree", "")).lower(), 0)
        j_level = DEGREE_LEVELS.get(
            str(job_edu.get("degree_level", job_edu.get("degree", ""))).lower(), 0
        )
        if 0 < r_level < j_level:
            target = next((k for k, v in DEGREE_LEVELS.items() if v == j_level), "higher degree")
            gaps.append({
                "category": "education",
                "item": f"{target} degree",
                "impact": "low",
                "recommendation": f"Role prefers a {target} degree; candidate has a lower qualification",
            })

    # Score improvement estimate
    current = result["fit_score"]
    if gaps and current < 90:
        potential = min(95, current + len(gaps) * 3)
        gaps.insert(0, {
            "category": "summary",
            "item": f"Potential: {round(current)}% → {round(potential)}%",
            "impact": "info",
            "recommendation": f"Closing {len(gaps) - 1} gap{'s' if len(gaps) > 2 else ''} could raise the score to ~{round(potential)}%",
        })

    return gaps
