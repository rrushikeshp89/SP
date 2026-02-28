"""
test_e2e_integration.py — End-to-End Integration Tests
Phase 5: Validates the full pipeline from API to DB to scoring.

Run with:
    pytest tests/test_e2e_integration.py -v

Requires the backend server running at http://localhost:8000
(or set E2E_BASE_URL environment variable).
"""

import os
import io
import time
import pytest
import requests

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:8000")
API = f"{BASE_URL}/api"


# ── Helpers ──────────────────────────────────────────

def wait_for_server(url: str, timeout: int = 60) -> bool:
    """Poll the health endpoint until the server is ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{url}/health", timeout=5)
            if r.status_code == 200 and r.json().get("status") == "healthy":
                return True
        except requests.ConnectionError:
            pass
        time.sleep(2)
    return False


# ── Fixtures ─────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def server_ready():
    """Ensure the backend is reachable before running tests."""
    if not wait_for_server(BASE_URL):
        pytest.skip(f"Backend not reachable at {BASE_URL}")


@pytest.fixture(scope="session")
def sample_resume_text() -> str:
    return """
    John Smith
    john.smith@email.com | (555) 123-4567

    EXPERIENCE
    Senior Software Engineer — Google (2019-2024)
    - Led development of microservices using Python, FastAPI, and Docker
    - Designed ML pipelines with TensorFlow and scikit-learn
    - Managed PostgreSQL databases with 50M+ records
    - Mentored 5 junior developers

    Software Engineer — Amazon (2016-2019)
    - Built RESTful APIs serving 10K+ requests/sec
    - Implemented CI/CD pipelines with Jenkins and GitHub Actions
    - Developed data processing pipelines using Apache Spark

    EDUCATION
    M.S. Computer Science — Stanford University (2016)
    B.S. Computer Science — UC Berkeley (2014)

    SKILLS
    Python, Java, JavaScript, TypeScript, FastAPI, Django, React, Docker,
    Kubernetes, PostgreSQL, Redis, TensorFlow, scikit-learn, AWS, GCP
    """


@pytest.fixture(scope="session")
def sample_job_data() -> dict:
    return {
        "title": "Senior Backend Engineer",
        "company": "TechCorp",
        "description": (
            "We are looking for a Senior Backend Engineer to design and build "
            "scalable microservices using Python and FastAPI. The ideal candidate "
            "has experience with Docker, Kubernetes, PostgreSQL, and Redis. "
            "Machine learning experience with TensorFlow or scikit-learn is a plus. "
            "Must have 5+ years of software engineering experience and a CS degree."
        ),
        "required_skills": [
            "Python", "FastAPI", "Docker", "Kubernetes",
            "PostgreSQL", "Redis", "TensorFlow"
        ],
        "experience_years": 5,
        "education": {
            "degree_level": "master",
            "field": "Computer Science"
        },
    }


# ── Tests ────────────────────────────────────────────

class TestHealthCheck:
    """1. Health endpoint returns healthy status."""

    def test_health_returns_200(self):
        r = requests.get(f"{BASE_URL}/health")
        assert r.status_code == 200

    def test_health_payload(self):
        data = requests.get(f"{BASE_URL}/health").json()
        assert data["status"] == "healthy"
        assert "model" in data


class TestResumeUpload:
    """2. Resume upload, parsing, and retrieval."""

    @pytest.fixture(scope="class")
    def uploaded_resume(self, sample_resume_text) -> dict:
        """Upload a resume and return the response."""
        file_obj = io.BytesIO(sample_resume_text.encode("utf-8"))
        files = {"file": ("john_smith.txt", file_obj, "text/plain")}
        data = {
            "candidate_name": "John Smith",
            "email": "john.smith@email.com",
            "phone": "(555) 123-4567",
        }
        r = requests.post(f"{API}/resumes/upload", files=files, data=data)
        assert r.status_code == 201, f"Upload failed: {r.text}"
        return r.json()

    def test_upload_returns_resume_id(self, uploaded_resume):
        assert "resume_id" in uploaded_resume
        assert uploaded_resume["resume_id"]

    def test_upload_returns_candidate_name(self, uploaded_resume):
        assert uploaded_resume["candidate_name"] == "John Smith"

    def test_upload_extracts_skills(self, uploaded_resume):
        assert isinstance(uploaded_resume["skills"], list)
        assert len(uploaded_resume["skills"]) > 0

    def test_upload_extracts_known_skills(self, uploaded_resume):
        skills_lower = [s.lower() for s in uploaded_resume["skills"]]
        # At least some of these should be detected
        expected_some = {"python", "docker", "fastapi", "react", "postgresql"}
        found = expected_some & set(skills_lower)
        assert len(found) >= 2, f"Expected some of {expected_some}, got {skills_lower}"

    def test_get_resume_by_id(self, uploaded_resume):
        rid = uploaded_resume["resume_id"]
        r = requests.get(f"{API}/resumes/{rid}")
        assert r.status_code == 200
        data = r.json()
        assert data["resume_id"] == rid
        assert data["candidate_name"] == "John Smith"

    def test_list_resumes_includes_uploaded(self, uploaded_resume):
        r = requests.get(f"{API}/resumes", params={"page": 1, "per_page": 100})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        ids = [item["resume_id"] for item in data["items"]]
        assert uploaded_resume["resume_id"] in ids


class TestJobCreation:
    """3. Job creation and retrieval."""

    @pytest.fixture(scope="class")
    def created_job(self, sample_job_data) -> dict:
        """Create a job and return the response."""
        r = requests.post(f"{API}/jobs", json=sample_job_data)
        assert r.status_code == 201, f"Job creation failed: {r.text}"
        return r.json()

    def test_create_returns_job_id(self, created_job):
        assert "job_id" in created_job
        assert created_job["job_id"]

    def test_create_returns_title(self, created_job):
        assert created_job["title"] == "Senior Backend Engineer"

    def test_create_returns_skills(self, created_job):
        assert "Python" in created_job["required_skills"]
        assert "FastAPI" in created_job["required_skills"]

    def test_get_job_by_id(self, created_job):
        jid = created_job["job_id"]
        r = requests.get(f"{API}/jobs/{jid}")
        assert r.status_code == 200
        assert r.json()["job_id"] == jid

    def test_list_jobs_includes_created(self, created_job):
        r = requests.get(f"{API}/jobs", params={"page": 1, "per_page": 100})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        ids = [item["job_id"] for item in data["items"]]
        assert created_job["job_id"] in ids


class TestScoring:
    """4. Single and batch scoring (the core pipeline)."""

    @pytest.fixture(scope="class")
    def resume_and_job(self, sample_resume_text, sample_job_data) -> tuple[str, str]:
        """Upload a resume and create a job, return (resume_id, job_id)."""
        # Upload resume
        file_obj = io.BytesIO(sample_resume_text.encode("utf-8"))
        files = {"file": ("scoring_test.txt", file_obj, "text/plain")}
        data = {"candidate_name": "Score Test User"}
        r1 = requests.post(f"{API}/resumes/upload", files=files, data=data)
        assert r1.status_code == 201
        resume_id = r1.json()["resume_id"]

        # Create job
        r2 = requests.post(f"{API}/jobs", json=sample_job_data)
        assert r2.status_code == 201
        job_id = r2.json()["job_id"]

        return resume_id, job_id

    def test_single_score(self, resume_and_job):
        resume_id, job_id = resume_and_job
        r = requests.post(f"{API}/score", json={
            "resume_id": resume_id,
            "job_id": job_id,
        })
        assert r.status_code == 200
        data = r.json()

        # Validate score structure
        assert "overall_score" in data
        assert 0.0 <= data["overall_score"] <= 100.0

        # Validate breakdown exists
        assert "breakdown" in data
        breakdown = data["breakdown"]
        for key in ["semantic", "skills", "experience", "education"]:
            assert key in breakdown, f"Missing breakdown key: {key}"
            assert "score" in breakdown[key]

    def test_single_score_has_missing_skills(self, resume_and_job):
        resume_id, job_id = resume_and_job
        r = requests.post(f"{API}/score", json={
            "resume_id": resume_id,
            "job_id": job_id,
        })
        data = r.json()
        # missing_skills should be a list (may be empty if candidate has all)
        assert "missing_skills" in data
        assert isinstance(data["missing_skills"], list)

    def test_score_is_reasonable_for_good_match(self, resume_and_job):
        """A senior Python dev should score > 30 against a Python backend role."""
        resume_id, job_id = resume_and_job
        r = requests.post(f"{API}/score", json={
            "resume_id": resume_id,
            "job_id": job_id,
        })
        data = r.json()
        assert data["overall_score"] > 30.0, (
            f"Expected decent score for well-matched resume, got {data['overall_score']}"
        )

    def test_batch_score(self, resume_and_job):
        resume_id, job_id = resume_and_job
        r = requests.post(f"{API}/score/batch", json={
            "job_id": job_id,
            "resume_ids": [resume_id],
        })
        assert r.status_code == 200
        data = r.json()

        assert "ranked_candidates" in data
        assert len(data["ranked_candidates"]) >= 1
        assert data["total_candidates"] >= 1

        top = data["ranked_candidates"][0]
        assert "resume_id" in top
        assert "overall_score" in top
        assert 0.0 <= top["overall_score"] <= 100.0

    def test_batch_score_ranking_order(self, resume_and_job):
        """Batch results should be sorted by score descending."""
        resume_id, job_id = resume_and_job
        r = requests.post(f"{API}/score/batch", json={
            "job_id": job_id,
            "resume_ids": [resume_id],
        })
        candidates = r.json()["ranked_candidates"]
        scores = [c["overall_score"] for c in candidates]
        assert scores == sorted(scores, reverse=True)


class TestEdgeCases:
    """5. Error handling and edge cases."""

    def test_get_nonexistent_resume_404(self):
        r = requests.get(f"{API}/resumes/nonexistent-id-12345")
        assert r.status_code in (404, 422)

    def test_get_nonexistent_job_404(self):
        r = requests.get(f"{API}/jobs/nonexistent-id-12345")
        assert r.status_code in (404, 422)

    def test_score_with_invalid_ids(self):
        r = requests.post(f"{API}/score", json={
            "resume_id": "fake-resume",
            "job_id": "fake-job",
        })
        # Should return an error, not 200
        assert r.status_code in (404, 422, 400, 500)

    def test_upload_without_file_fails(self):
        r = requests.post(f"{API}/resumes/upload", data={
            "candidate_name": "No File User"
        })
        assert r.status_code == 422

    def test_create_job_without_title_fails(self):
        r = requests.post(f"{API}/jobs", json={
            "description": "A job with no title"
        })
        assert r.status_code == 422


class TestFullPipeline:
    """6. End-to-end: upload → create job → score → rank."""

    def test_complete_workflow(self):
        """Simulates the full recruiter workflow."""

        # Step 1: Upload two resumes
        resumes = []
        for name, text in [
            ("Alice Engineer", "Python FastAPI Docker Kubernetes PostgreSQL 5 years experience MS CS"),
            ("Bob Designer", "Figma Photoshop UI/UX HTML CSS JavaScript 3 years experience BA Design"),
        ]:
            file_obj = io.BytesIO(text.encode("utf-8"))
            r = requests.post(
                f"{API}/resumes/upload",
                files={"file": (f"{name.lower().replace(' ', '_')}.txt", file_obj, "text/plain")},
                data={"candidate_name": name},
            )
            assert r.status_code == 201, f"Upload {name} failed: {r.text}"
            resumes.append(r.json())

        # Step 2: Create a backend engineering job
        job_r = requests.post(f"{API}/jobs", json={
            "title": "E2E Test — Backend Engineer",
            "company": "TestCorp",
            "description": "Looking for a Python backend engineer with FastAPI, Docker, and PostgreSQL experience.",
            "required_skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
            "experience_years": 3,
        })
        assert job_r.status_code == 201
        job = job_r.json()

        # Step 3: Batch score both resumes
        batch_r = requests.post(f"{API}/score/batch", json={
            "job_id": job["job_id"],
            "resume_ids": [r["resume_id"] for r in resumes],
        })
        assert batch_r.status_code == 200
        result = batch_r.json()

        # Step 4: Verify ranking
        assert result["total_candidates"] == 2
        ranked = result["ranked_candidates"]
        assert len(ranked) == 2

        # Alice (the engineer) should rank higher than Bob (the designer)
        alice_score = next(c for c in ranked if c["resume_id"] == resumes[0]["resume_id"])
        bob_score = next(c for c in ranked if c["resume_id"] == resumes[1]["resume_id"])
        assert alice_score["overall_score"] > bob_score["overall_score"], (
            f"Expected Alice ({alice_score['overall_score']}) > Bob ({bob_score['overall_score']})"
        )

        # Step 5: Verify scores are valid
        for c in ranked:
            assert 0.0 <= c["overall_score"] <= 100.0
            assert "breakdown" in c
