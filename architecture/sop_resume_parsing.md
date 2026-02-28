# SOP: Resume Parsing

> Module: `tools/text_extractor.py`
> Last Updated: 2026-02-28
> Status: **Active**

---

## 1. Purpose

Extract clean, readable plain text from uploaded resume files (PDF, DOCX, TXT).
The output text is the foundation for all downstream NLP — embedding, skill extraction, and scoring.

---

## 2. Input Contract

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_path` | `str \| Path` | Yes | Absolute path to the uploaded file in `.tmp/` |
| `file_format` | `str` | Yes | One of: `pdf`, `docx`, `txt` |

The file MUST exist at `file_path` before calling. The caller (API layer) is responsible for saving the upload to `.tmp/`.

---

## 3. Output Contract

```python
@dataclass
class ExtractionResult:
    success: bool               # True if text was extracted
    raw_text: str               # Extracted full text (empty string on failure)
    page_count: int | None      # Number of pages (PDF only)
    method_used: str            # "pdfplumber" | "pymupdf" | "ocr" | "python-docx" | "direct"
    error_message: str | None   # Error details if success=False
    processing_time_ms: float   # Time taken in milliseconds
```

---

## 4. Processing Pipeline

```
Input File
  │
  ├─ format == "txt"
  │   └─ Read file as UTF-8 (with fallback to latin-1)
  │      └─ Return raw text
  │
  ├─ format == "docx"
  │   └─ python-docx: extract all paragraphs + table cells
  │      └─ Join with newlines → Return raw text
  │
  └─ format == "pdf"
      ├─ Step 1: pdfplumber (primary)
      │   └─ Extract text page-by-page, join with page separators
      │   └─ IF text is empty or <50 chars → fallback
      │
      ├─ Step 2: PyMuPDF / fitz (fallback)
      │   └─ Extract text with get_text("text")
      │   └─ IF text is empty or <50 chars → fallback
      │
      └─ Step 3: OCR placeholder (future)
          └─ Return error with parsing_failed flag
          └─ (Tesseract integration deferred to v2)
```

---

## 5. Behavioral Rules

1. **No exceptions escape**: All parsing errors are caught internally and returned via `ExtractionResult.error_message`.
2. **Minimum text threshold**: If extracted text is <50 characters after stripping whitespace, the extraction is considered failed and the next fallback is tried.
3. **Encoding safety**: Always try UTF-8 first, then fall back to `latin-1` for TXT files.
4. **No side effects**: The function does not modify or delete the input file.
5. **Determinism**: Same file → same text output every time.
6. **Text cleaning**: Strip excessive whitespace (3+ consecutive newlines → 2), but preserve paragraph structure.

---

## 6. Error Scenarios

| Scenario | Response |
|----------|----------|
| File not found | `success=False`, `error_message="File not found: {path}"` |
| Unsupported format | `success=False`, `error_message="Unsupported format: {fmt}"` |
| PDF all methods fail | `success=False`, `method_used="none"`, `error_message="All extraction methods failed"` |
| DOCX corrupted | `success=False`, `error_message="DOCX parsing error: {detail}"` |
| Permission denied | `success=False`, `error_message="Permission denied: {path}"` |

---

## 7. Dependencies

- `pdfplumber>=0.10.0`
- `PyMuPDF>=1.23.0` (imported as `fitz`)
- `python-docx>=1.1.0`
- Python stdlib: `pathlib`, `time`, `dataclasses`

---

## 8. Test Cases

| # | Input | Expected Output |
|---|-------|-----------------|
| T1 | Valid PDF with text | `success=True`, `method_used="pdfplumber"`, non-empty `raw_text` |
| T2 | Valid DOCX | `success=True`, `method_used="python-docx"`, non-empty `raw_text` |
| T3 | Plain TXT (UTF-8) | `success=True`, `method_used="direct"`, exact file contents |
| T4 | Image-only PDF | `success=False` (OCR not yet implemented) |
| T5 | Non-existent file | `success=False`, `error_message` contains "not found" |
| T6 | Unsupported format (.jpg) | `success=False`, `error_message` contains "Unsupported" |
| T7 | Empty PDF (0 text) | Falls through to PyMuPDF, then fails gracefully |
