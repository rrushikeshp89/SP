"""
jobs.py — Job Description API Router
Layer 2 (Navigation): Routes for JD creation, retrieval, and listing.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.models.job import JobCreateRequest, JobResponse, PaginatedJobs
from tools.vectorizer import embed_text
from tools.skill_extractor import extract_skills
from tools.db_handler import save_job, get_job, list_jobs, delete_job

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(payload: JobCreateRequest):
    """Create a new job description, embed text, extract skills, and store."""

    full_text = _build_text(payload)

    # 1. Generate embedding
    embedding = embed_text(full_text)
    if not embedding.success:
        raise HTTPException(status_code=503, detail=f"Embedding failed: {embedding.error_message}")

    # 2. Extract skills from description
    skill_result = extract_skills(full_text)
    extracted_skills = skill_result.skills if skill_result.success else []

    # Merge with explicit required_skills (deduplicated)
    all_skills = sorted(set(payload.required_skills + extracted_skills))

    # 3. Build record
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    job_data = {
        "job_id": job_id,
        "title": payload.title,
        "company": payload.company,
        "description": payload.description,
        "required_skills": all_skills,
        "experience_years": payload.experience_years,
        "education": payload.education.model_dump() if payload.education else None,
        "embedding_vector": embedding.vector,
        "created_at": now,
        "updated_at": now,
    }

    # 4. Save to database
    save_job(job_data)

    return JobResponse(
        **{k: v for k, v in job_data.items() if k != "embedding_vector"}
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(job_id: str):
    """Retrieve a job description by ID."""
    result = get_job(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return JobResponse(**result)


@router.get("", response_model=PaginatedJobs)
async def list_all_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
):
    """List all job descriptions with pagination."""
    result = list_jobs(page=page, per_page=per_page)
    return PaginatedJobs(**result)


@router.delete("/{job_id}", status_code=204)
async def remove_job(job_id: str):
    """Delete a job description by ID."""
    deleted = delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return None


def _build_text(payload: JobCreateRequest) -> str:
    """Combine JD fields into a single text block for embedding."""
    parts = [payload.title, payload.description]
    if payload.required_skills:
        parts.append("Required skills: " + ", ".join(payload.required_skills))
    if payload.experience_years is not None:
        parts.append(f"Experience required: {payload.experience_years} years")
    if payload.education:
        parts.append(f"Education: {payload.education.degree_level or ''} in {payload.education.field or ''}")
    return "\n".join(parts)
