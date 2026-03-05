"""
scoring.py — Scoring API Router
Layer 2 (Navigation): Routes for fit scoring and batch ranking.
"""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.models.score import (
    ScoreRequest,
    BatchScoreRequest,
    ScoreResponse,
    BatchScoreResponse,
    RankedCandidate,
    ScoreHistoryItem,
)
from tools.scorer import compute_fit_score
from tools.db_handler import (
    get_resume,
    get_job,
    save_score_record,
    get_score_history,
    get_scoring_profile,
    list_resumes,
)

router = APIRouter(prefix="/api/score", tags=["Scoring"])


def _resolve_weights(profile_id: str | None) -> dict | None:
    """Look up custom weights from a scoring profile."""
    if not profile_id:
        return None
    profile = get_scoring_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Scoring profile not found: {profile_id}")
    return profile["weights"]


@router.post("", response_model=ScoreResponse)
async def score_pair(
    payload: ScoreRequest,
    profile_id: str | None = Query(None, description="Optional scoring profile ID"),
):
    """Score a single resume against a single job description."""
    resume = get_resume(payload.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail=f"Resume not found: {payload.resume_id}")

    job = get_job(payload.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {payload.job_id}")

    weights = _resolve_weights(profile_id)
    result = compute_fit_score(resume, job, custom_weights=weights)

    # Persist to score history
    save_score_record({
        "resume_id": payload.resume_id,
        "job_id": payload.job_id,
        "overall_score": result["fit_score"],
        "breakdown": result["breakdown"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "explanation": result.get("explanation", ""),
        "gap_report": result.get("gap_report", []),
        "scored_at": datetime.now(timezone.utc).isoformat(),
    })

    return ScoreResponse(
        overall_score=result["fit_score"],
        breakdown=result["breakdown"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        partially_matched=result.get("partially_matched", []),
        suggestions=result.get("suggestions", []),
        explanation=result.get("explanation", ""),
        gap_report=result.get("gap_report", []),
    )


@router.post("/batch", response_model=BatchScoreResponse)
async def score_batch(
    payload: BatchScoreRequest,
    profile_id: str | None = Query(None, description="Optional scoring profile ID"),
):
    """Score multiple resumes against a single job and return ranked list."""
    job = get_job(payload.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {payload.job_id}")

    weights = _resolve_weights(profile_id)
    candidates: list[RankedCandidate] = []
    now = datetime.now(timezone.utc).isoformat()

    for rid in payload.resume_ids:
        resume = get_resume(rid)
        if resume is None:
            continue
        result = compute_fit_score(resume, job, custom_weights=weights)

        # Persist each score
        save_score_record({
            "resume_id": rid,
            "job_id": payload.job_id,
            "overall_score": result["fit_score"],
            "breakdown": result["breakdown"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "explanation": result.get("explanation", ""),
            "gap_report": result.get("gap_report", []),
            "scored_at": now,
        })

        candidates.append(
            RankedCandidate(
                resume_id=rid,
                candidate_name=resume.get("candidate_name", ""),
                overall_score=result["fit_score"],
                breakdown=result["breakdown"],
                matched_skills=result["matched_skills"],
                missing_skills=result["missing_skills"],
                suggestions=result.get("suggestions", []),
                explanation=result.get("explanation", ""),
                gap_report=result.get("gap_report", []),
            )
        )

    candidates.sort(key=lambda c: c.overall_score, reverse=True)
    for idx, c in enumerate(candidates):
        c.rank = idx + 1

    return BatchScoreResponse(
        job_id=payload.job_id,
        total_candidates=len(candidates),
        ranked_candidates=candidates,
    )


# ── Score History ────────────────────────────────────

@router.get("/history", response_model=list[ScoreHistoryItem])
async def score_history(
    resume_id: str | None = Query(None),
    job_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """Return recent scoring history, optionally filtered."""
    rows = get_score_history(resume_id=resume_id, job_id=job_id, limit=limit)
    return rows


# ── CSV Export ───────────────────────────────────────

@router.get("/export/csv")
async def export_csv(
    job_id: str = Query(..., description="Job to export rankings for"),
    profile_id: str | None = Query(None),
):
    """Export rankings for a job as a downloadable CSV file."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    weights = _resolve_weights(profile_id)

    # Gather all resumes and score them
    all_resumes = list_resumes(page=1, per_page=1000)
    rows: list[dict] = []
    for r in all_resumes["items"]:
        result = compute_fit_score(r, job, custom_weights=weights)
        rows.append({
            "rank": 0,
            "candidate_name": r.get("candidate_name", ""),
            "overall_score": result["fit_score"],
            "semantic": result["breakdown"]["semantic"]["score"],
            "skills": result["breakdown"]["skills"]["score"],
            "experience": result["breakdown"]["experience"]["score"],
            "education": result["breakdown"]["education"]["score"],
            "matched_skills": "; ".join(result["matched_skills"]),
            "missing_skills": "; ".join(result["missing_skills"]),
            "explanation": result.get("explanation", ""),
        })

    rows.sort(key=lambda r: r["overall_score"], reverse=True)
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1

    buf = io.StringIO()
    if rows:
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    else:
        buf.write("No resumes found\n")

    buf.seek(0)
    job_title = job.get("title", "export").replace(" ", "_")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="rankings_{job_title}.csv"'},
    )
