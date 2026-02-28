"""
test_scorer.py — Unit tests for the scoring engine.
"""

import pytest

from tools.scorer import compute_fit_score


def _make_resume(
    embedding=None, skills=None, experience_years=None, education=None
):
    return {
        "embedding_vector": embedding or [0.1] * 384,
        "skills": skills or [],
        "experience_years": experience_years,
        "education": education,
    }


def _make_job(
    embedding=None, required_skills=None, preferred_skills=None,
    experience_years=None, education=None,
):
    return {
        "embedding_vector": embedding or [0.1] * 384,
        "required_skills": required_skills or [],
        "preferred_skills": preferred_skills or [],
        "experience_years": experience_years,
        "education": education,
    }


class TestFitScore:
    """Core scoring tests."""

    def test_identical_match(self):
        vec = [0.1] * 384
        resume = _make_resume(embedding=vec, skills=["python", "react"])
        job = _make_job(embedding=vec, required_skills=["python", "react"])
        result = compute_fit_score(resume, job)
        assert result["fit_score"] >= 80  # near-perfect match

    def test_no_overlap(self):
        import numpy as np
        # Orthogonal-ish vectors
        a = np.random.RandomState(42).randn(384).tolist()
        b = np.random.RandomState(99).randn(384).tolist()
        resume = _make_resume(embedding=a, skills=["python"])
        job = _make_job(embedding=b, required_skills=["java", "go", "rust"])
        result = compute_fit_score(resume, job)
        assert result["fit_score"] < 60

    def test_empty_required_skills(self):
        """No required skills → skill score = 100."""
        resume = _make_resume(skills=["python"])
        job = _make_job(required_skills=[])
        result = compute_fit_score(resume, job)
        assert result["breakdown"]["skills"]["score"] == 100.0

    def test_missing_experience_neutral(self):
        """Missing experience data → neutral score of 50."""
        resume = _make_resume()
        job = _make_job()
        result = compute_fit_score(resume, job)
        assert result["breakdown"]["experience"]["score"] == 50.0

    def test_education_exceeds(self):
        """Education exceeds requirement → high education score."""
        resume = _make_resume(education={"degree": "master", "field": "computer science"})
        job = _make_job(education={"degree_level": "bachelor", "field": "computer science"})
        result = compute_fit_score(resume, job)
        assert result["breakdown"]["education"]["score"] >= 80

    def test_score_clamped(self):
        """Fit score always in [0, 100]."""
        resume = _make_resume()
        job = _make_job()
        result = compute_fit_score(resume, job)
        assert 0 <= result["fit_score"] <= 100

    def test_determinism(self):
        """Same inputs → same score."""
        vec = [0.5] * 384
        resume = _make_resume(embedding=vec, skills=["python", "docker"])
        job = _make_job(embedding=vec, required_skills=["python"])
        r1 = compute_fit_score(resume, job)
        r2 = compute_fit_score(resume, job)
        assert r1["fit_score"] == r2["fit_score"]
        assert r1["breakdown"] == r2["breakdown"]


class TestSuggestions:
    """Verify suggestion generation rules."""

    def test_missing_skills_suggestion(self):
        resume = _make_resume(skills=[])
        job = _make_job(required_skills=["python", "java"])
        result = compute_fit_score(resume, job)
        assert any("python" in s.lower() for s in result["suggestions"])

    def test_experience_gap_suggestion(self):
        resume = _make_resume(experience_years=2)
        job = _make_job(experience_years=5)
        result = compute_fit_score(resume, job)
        assert any("experience" in s.lower() for s in result["suggestions"])

    def test_strong_match_encouragement(self):
        vec = [0.5] * 384
        resume = _make_resume(
            embedding=vec,
            skills=["python", "react", "docker"],
            experience_years=10,
            education={"degree": "master", "field": "computer science"},
        )
        job = _make_job(
            embedding=vec,
            required_skills=["python", "react"],
            experience_years=3,
            education={"degree_level": "bachelor", "field": "computer science"},
        )
        result = compute_fit_score(resume, job)
        if result["fit_score"] > 80:
            assert any("strong match" in s.lower() for s in result["suggestions"])
