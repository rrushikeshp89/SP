"""
test_text_extractor.py — Unit tests for text extraction tool.
"""

import tempfile
import os
from pathlib import Path

import pytest

from tools.text_extractor import extract_text, ExtractionResult


class TestTxtExtraction:
    """Tests for plain text file extraction."""

    def test_valid_utf8(self, tmp_path: Path):
        f = tmp_path / "resume.txt"
        f.write_text("This is a sample resume with enough text to pass threshold checks.", encoding="utf-8")
        result = extract_text(str(f), "txt")
        assert result.success is True
        assert result.method_used == "direct"
        assert "sample resume" in result.raw_text

    def test_empty_file(self, tmp_path: Path):
        f = tmp_path / "empty.txt"
        f.write_text("", encoding="utf-8")
        result = extract_text(str(f), "txt")
        assert result.success is True
        assert result.raw_text == ""

    def test_file_not_found(self):
        result = extract_text("/nonexistent/resume.txt", "txt")
        assert result.success is False
        assert "not found" in (result.error_message or "")

    def test_unsupported_format(self, tmp_path: Path):
        f = tmp_path / "image.jpg"
        f.write_bytes(b"\xff\xd8\xff")
        result = extract_text(str(f), "jpg")
        assert result.success is False
        assert "Unsupported" in (result.error_message or "")

    def test_processing_time_recorded(self, tmp_path: Path):
        f = tmp_path / "test.txt"
        f.write_text("Some content here for timing test.", encoding="utf-8")
        result = extract_text(str(f), "txt")
        assert result.processing_time_ms >= 0

    def test_excessive_newlines_cleaned(self, tmp_path: Path):
        f = tmp_path / "messy.txt"
        f.write_text("Line one\n\n\n\n\nLine two has enough text to be meaningful.", encoding="utf-8")
        result = extract_text(str(f), "txt")
        assert result.success is True
        assert "\n\n\n" not in result.raw_text


class TestDocxExtraction:
    """Tests for DOCX extraction (requires python-docx)."""

    def test_valid_docx(self, tmp_path: Path):
        try:
            from docx import Document
        except ImportError:
            pytest.skip("python-docx not installed")

        f = tmp_path / "resume.docx"
        doc = Document()
        doc.add_paragraph("Senior Python Developer with 10 years of experience in backend systems.")
        doc.save(str(f))

        result = extract_text(str(f), "docx")
        assert result.success is True
        assert result.method_used == "python-docx"
        assert "Python Developer" in result.raw_text


class TestPdfExtraction:
    """Tests for PDF extraction fallback chain."""

    def test_nonexistent_pdf(self):
        result = extract_text("/fake/path.pdf", "pdf")
        assert result.success is False


class TestDeterminism:
    """Ensure same input → same output."""

    def test_same_txt_twice(self, tmp_path: Path):
        f = tmp_path / "determinism.txt"
        f.write_text("Deterministic resume content for reproducibility test here.", encoding="utf-8")
        r1 = extract_text(str(f), "txt")
        r2 = extract_text(str(f), "txt")
        assert r1.raw_text == r2.raw_text
        assert r1.success == r2.success
