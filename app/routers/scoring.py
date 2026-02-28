"""
scoring.py — Scoring API Router
Layer 2 (Navigation): Routes for fit scoring and batch ranking.
"""

from fastapi import APIRouter, HTTPException

from app.models.score import (
    ScoreRequest,
    BatchScoreRequest,
    ScoreResponse,
    BatchScoreResponse,
    RankedCandidate,
)
from tools.scorer import compute_fit_score
from tools.db_handler import get_resume, get_job

router = APIRouter(prefix="/api/score", tags=["Scoring"])


@router.post("", response_model=ScoreResponse)
async def score_pair(payload: ScoreRequest):
    """Score a single resume against a single job description."""

    resume = get_resume(payload.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail=f"Resume not found: {payload.resume_id}")

    job = get_job(payload.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {payload.job_id}")

    result = compute_fit_score(resume, job)
    return ScoreResponse(
        overall_score=result["fit_score"],
        breakdown=result["breakdown"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        partially_matched=result.get("partially_matched", []),
        suggestions=result.get("suggestions", []),
    )


@router.post("/batch", response_model=BatchScoreResponse)
async def score_batch(payload: BatchScoreRequest):
    """Score multiple resumes against a single job and return ranked list."""

    job = get_job(payload.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {payload.job_id}")

    candidates: list[RankedCandidate] = []

    for rid in payload.resume_ids:
        resume = get_resume(rid)
        if resume is None:
            continue  # skip missing resumes silently in batch mode
        result = compute_fit_score(resume, job)
        candidates.append(
            RankedCandidate(
                resume_id=rid,
                candidate_name=resume.get("candidate_name", ""),
                overall_score=result["fit_score"],
                breakdown=result["breakdown"],
                matched_skills=result["matched_skills"],
                missing_skills=result["missing_skills"],
                suggestions=result.get("suggestions", []),
            )
        )

    # Sort descending by score, assign ranks
    candidates.sort(key=lambda c: c.overall_score, reverse=True)
    for idx, c in enumerate(candidates):
        c.rank = idx + 1

    return BatchScoreResponse(
        job_id=payload.job_id,
        total_candidates=len(candidates),
        ranked_candidates=candidates,
    )
