"""
test_db_handler.py — Unit tests for PostgreSQL database handler.
"""

import uuid
import pytest

from tools.db_handler import (
    init_tables,
    save_resume,
    get_resume,
    list_resumes,
    save_job,
    get_job,
    list_jobs,
)


@pytest.fixture(autouse=True, scope="module")
def setup_tables():
    """Ensure tables exist before tests."""
    init_tables()


class TestResumeCRUD:
    """Resume create/read/list operations."""

    def _make_resume(self):
        rid = str(uuid.uuid4())
        return {
            "resume_id": rid,
            "candidate_name": "Test User",
            "email": "test@example.com",
            "phone": "1234567890",
            "source_format": "txt",
            "raw_text": "Python developer with 5 years experience",
            "parsed_sections": {"skills": ["Python"]},
            "skills": ["Python"],
            "embedding_vector": [0.1] * 384,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
        }

    def test_save_and_get(self):
        data = self._make_resume()
        save_resume(data)
        result = get_resume(data["resume_id"])
        assert result is not None
        assert result["candidate_name"] == "Test User"
        assert result["skills"] == ["Python"]

    def test_get_nonexistent(self):
        result = get_resume("nonexistent-id-12345")
        assert result is None

    def test_list(self):
        data = self._make_resume()
        save_resume(data)
        result = list_resumes(page=1, per_page=100)
        assert result["total"] >= 1
        assert len(result["items"]) >= 1


class TestJobCRUD:
    """Job create/read/list operations."""

    def _make_job(self):
        jid = str(uuid.uuid4())
        return {
            "job_id": jid,
            "title": "Backend Developer",
            "company": "TestCo",
            "description": "Build APIs with Python and FastAPI",
            "required_skills": ["Python", "FastAPI"],
            "experience_years": 3,
            "education": {"degree_level": "bachelor", "field": "computer science"},
            "embedding_vector": [0.2] * 384,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
        }

    def test_save_and_get(self):
        data = self._make_job()
        save_job(data)
        result = get_job(data["job_id"])
        assert result is not None
        assert result["title"] == "Backend Developer"
        assert "Python" in result["required_skills"]

    def test_get_nonexistent(self):
        result = get_job("nonexistent-job-id-999")
        assert result is None

    def test_list(self):
        data = self._make_job()
        save_job(data)
        result = list_jobs(page=1, per_page=100)
        assert result["total"] >= 1
        assert len(result["items"]) >= 1
