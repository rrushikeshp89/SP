"""
resumes.py — Resume API Router
Layer 2 (Navigation): Routes for resume upload, retrieval, and listing.
"""

import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query

from app.config import TMP_DIR, ALLOWED_FORMATS
from app.models.resume import (
    ResumeResponse,
    ParsedSections,
    PaginatedResumes,
)

# Import tool functions (Layer 3)
from tools.text_extractor import extract_text
from tools.vectorizer import embed_text
from tools.skill_extractor import extract_skills
from tools.db_handler import save_resume, get_resume, list_resumes, delete_resume

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])


@router.post("/upload", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    candidate_name: str = Form(...),
    email: str | None = Form(None),
    phone: str | None = Form(None),
):
    """Upload a resume file (PDF/DOCX/TXT), parse, embed, and store."""

    # 1. Validate file format
    if not file.filename:
        raise HTTPException(status_code=422, detail="No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported format: .{ext}. Allowed: {', '.join(ALLOWED_FORMATS)}",
        )

    # 2. Save to .tmp/
    resume_id = str(uuid.uuid4())
    tmp_path = TMP_DIR / f"{resume_id}.{ext}"
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    finally:
        await file.close()

    # 3. Extract text
    extraction = extract_text(str(tmp_path), ext)
    if not extraction.success:
        _cleanup(tmp_path)
        raise HTTPException(status_code=422, detail=f"Parsing failed: {extraction.error_message}")

    # 4. Generate embedding
    embedding = embed_text(extraction.raw_text)
    if not embedding.success:
        _cleanup(tmp_path)
        raise HTTPException(status_code=503, detail=f"Embedding failed: {embedding.error_message}")

    # 5. Extract skills
    skill_result = extract_skills(extraction.raw_text)
    skills = skill_result.skills if skill_result.success else []

    # 6. Build response
    now = datetime.now(timezone.utc).isoformat()
    resume_data = {
        "resume_id": resume_id,
        "candidate_name": candidate_name,
        "email": email,
        "phone": phone,
        "source_format": ext,
        "raw_text": extraction.raw_text,
        "parsed_sections": ParsedSections(skills=skills).model_dump(),
        "skills": skills,
        "embedding_vector": embedding.vector,
        "created_at": now,
        "updated_at": now,
    }

    # 7. Save to database
    save_resume(resume_data)

    # 8. Cleanup temp file
    _cleanup(tmp_path)

    return ResumeResponse(**{k: v for k, v in resume_data.items() if k != "embedding_vector"})


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume_by_id(resume_id: str):
    """Retrieve a parsed resume by ID."""
    result = get_resume(resume_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Resume not found: {resume_id}")
    return ResumeResponse(**result)


@router.get("", response_model=PaginatedResumes)
async def list_all_resumes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
):
    """List all resumes with pagination."""
    result = list_resumes(page=page, per_page=per_page)
    return PaginatedResumes(**result)


@router.delete("/{resume_id}", status_code=204)
async def remove_resume(resume_id: str):
    """Delete a resume by ID."""
    deleted = delete_resume(resume_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Resume not found: {resume_id}")
    return None


def _cleanup(path: Path):
    """Delete a temp file silently."""
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass
