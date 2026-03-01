"""
main.py — FastAPI Application Entry Point
Layer 2 (Navigation): App factory, middleware, startup events, health check.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import EMBEDDING_MODEL
from app.routers import resumes_router, jobs_router, scoring_router
from tools.db_handler import get_dashboard_stats


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
