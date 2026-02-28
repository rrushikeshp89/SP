"""
test_skill_extractor.py — Unit tests for skill extraction tool.
"""

import pytest

from tools.skill_extractor import extract_skills, SkillExtractionResult


class TestSkillExtraction:
    """Core extraction tests per SOP test cases."""

    def test_python_fastapi(self):
        result = extract_skills("5 years of Python and FastAPI experience")
        assert result.success is True
        assert "Python" in result.skills
        assert "FastAPI" in result.skills

    def test_js_ts_react(self):
        result = extract_skills("JavaScript/TypeScript React developer")
        assert result.success is True
        assert "JavaScript" in result.skills
        assert "TypeScript" in result.skills
        assert "React" in result.skills

    def test_cloud_skills(self):
        result = extract_skills("AWS certified, Docker and Kubernetes")
        assert result.success is True
        assert "AWS" in result.skills
        assert "Docker" in result.skills
        assert "Kubernetes" in result.skills

    def test_java_not_javascript(self):
        result = extract_skills("Java developer with Spring Boot")
        assert result.success is True
        assert "Java" in result.skills
        # "JavaScript" should NOT be in the list
        assert "JavaScript" not in result.skills

    def test_empty_text(self):
        result = extract_skills("")
        assert result.success is True
        assert result.skills == []
        assert result.total_count == 0

    def test_soft_skills(self):
        result = extract_skills("Strong leadership and communication skills")
        assert result.success is True
        assert "Leadership" in result.skills
        assert "Communication" in result.skills

    def test_determinism(self):
        text = "Python, React, Docker, Machine Learning"
        r1 = extract_skills(text)
        r2 = extract_skills(text)
        assert r1.skills == r2.skills
        assert r1.total_count == r2.total_count


class TestCategorization:
    """Verify skills are categorized correctly."""

    def test_categories_populated(self):
        result = extract_skills("Python developer using PostgreSQL and Docker on AWS")
        assert result.success is True
        assert "programming_languages" in result.skill_categories
        assert "Python" in result.skill_categories["programming_languages"]
        assert "databases" in result.skill_categories
        assert "PostgreSQL" in result.skill_categories["databases"]


class TestEdgeCases:
    """Edge case handling."""

    def test_whitespace_only(self):
        result = extract_skills("   \n\t  ")
        assert result.success is True
        assert result.skills == []

    def test_no_skills_text(self):
        result = extract_skills("I like hiking and cooking on weekends")
        assert result.success is True
        assert result.total_count == 0

    def test_taxonomy_not_found(self):
        # Clear the cached taxonomy so a bad path actually triggers a reload
        import tools.skill_extractor as mod
        old_cache = mod._taxonomy_cache
        mod._taxonomy_cache = None
        try:
            result = extract_skills("Python", taxonomy_path="/bad/path.json")
            assert result.success is False
            assert "not found" in (result.error_message or "").lower()
        finally:
            mod._taxonomy_cache = old_cache
