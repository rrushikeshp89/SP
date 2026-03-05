"""
main.py — FastAPI Application Entry Point
Layer 2 (Navigation): App factory, middleware, startup events, health check.
"""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import EMBEDDING_MODEL
from app.routers import resumes_router, jobs_router, scoring_router
from app.models.resume import PipelineResponse, PipelineStage
from app.models.score import ScoringProfileCreate, ScoringProfileResponse
from tools.db_handler import (
    get_dashboard_stats,
    get_pipeline_data,
    save_scoring_profile,
    list_scoring_profiles,
    get_scoring_profile,
    delete_scoring_profile,
    PIPELINE_STAGES,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: preload embedding model; Shutdown: no-op."""
    from tools.vectorizer import preload_model
    preload_model()
    yield


app = FastAPI(
    title="Smart Resume Matching & Job Fit Scoring Engine",
    version="1.0.0",
    description="NLP-powered resume-to-JD matching with cosine-similarity scoring",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(scoring_router)


# ── Health Check ──
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "model": EMBEDDING_MODEL,
    }


# ── Dashboard Stats ──
@app.get("/api/stats", tags=["System"])
async def dashboard_stats():
    """Real-time dashboard statistics."""
    return get_dashboard_stats()


# ── Pipeline (Kanban) ──
@app.get("/api/pipeline", response_model=PipelineResponse, tags=["Pipeline"])
async def pipeline():
    """Get all resumes grouped by pipeline stage for Kanban view."""
    grouped = get_pipeline_data()
    stages = []
    total = 0
    for stage_name in PIPELINE_STAGES:
        candidates = grouped.get(stage_name, [])
        stages.append(PipelineStage(
            stage=stage_name,
            count=len(candidates),
            candidates=candidates,
        ))
        total += len(candidates)
    return PipelineResponse(stages=stages, total=total)


# ── Scoring Profiles CRUD ──
@app.post("/api/scoring-profiles", response_model=ScoringProfileResponse, tags=["Scoring Profiles"])
async def create_profile(payload: ScoringProfileCreate):
    """Create a new scoring profile."""
    # Validate weights
    w = payload.weights
    required_keys = {"semantic", "skills", "experience", "education"}
    if set(w.keys()) != required_keys:
        raise HTTPException(status_code=422, detail=f"Weights must have exactly keys: {required_keys}")
    total = sum(w.values())
    if abs(total - 1.0) > 0.01:
        raise HTTPException(status_code=422, detail=f"Weights must sum to 1.0, got {total:.4f}")

    now = datetime.now(timezone.utc).isoformat()
    profile_id = str(uuid.uuid4())
    save_scoring_profile({
        "profile_id": profile_id,
        "name": payload.name,
        "description": payload.description,
        "weights": payload.weights,
        "is_default": payload.is_default,
        "created_at": now,
        "updated_at": now,
    })
    return ScoringProfileResponse(
        profile_id=profile_id,
        name=payload.name,
        description=payload.description,
        weights=payload.weights,
        is_default=payload.is_default,
    )


@app.get("/api/scoring-profiles", response_model=list[ScoringProfileResponse], tags=["Scoring Profiles"])
async def get_profiles():
    """List all scoring profiles."""
    return list_scoring_profiles()


@app.get("/api/scoring-profiles/{profile_id}", response_model=ScoringProfileResponse, tags=["Scoring Profiles"])
async def get_profile(profile_id: str):
    """Get a single scoring profile."""
    p = get_scoring_profile(profile_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return p


@app.delete("/api/scoring-profiles/{profile_id}", status_code=204, tags=["Scoring Profiles"])
async def remove_profile(profile_id: str):
    """Delete a scoring profile."""
    if not delete_scoring_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    return None
