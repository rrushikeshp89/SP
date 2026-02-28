"""Router package — re-exports all API routers."""

from app.routers.resumes import router as resumes_router
from app.routers.jobs import router as jobs_router
from app.routers.scoring import router as scoring_router

__all__ = ["resumes_router", "jobs_router", "scoring_router"]
