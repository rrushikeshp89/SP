# SOP: API Routing

> Module: `app/main.py`, `app/routers/`, `app/models/`
> Last Updated: 2026-02-28
> Status: **Active**

---

## 1. Purpose

Define the FastAPI navigation layer — all HTTP routes, Pydantic request/response models,
and the orchestration logic that connects API requests to tool functions.
This layer is **deterministic**: no ML logic, no business rules — only routing and validation.

---

## 2. Architectural Constraint

```
React Frontend → HTTP Request
  → FastAPI Router (validation via Pydantic)
    → Tool function call (text_extractor, vectorizer, scorer, etc.)
      → Response formatted to schema
        → JSON Response
```

**The router NEVER imports ML models directly.** It only calls functions from `tools/`.

---

## 3. Endpoint Definitions

### 3.1 Resume Endpoints (`app/routers/resumes.py`)

| Method | Path | Request | Response | Tool Calls |
|--------|------|---------|----------|------------|
| POST | `/api/resumes/upload` | `UploadFile` + metadata | `ResumeResponse` | `text_extractor` → `vectorizer` → `skill_extractor` → `db_handler.save_resume` |
| GET | `/api/resumes/{id}` | Path param UUID | `ResumeResponse` | `db_handler.get_resume` |
| GET | `/api/resumes` | Query: `page`, `per_page` | `PaginatedResumes` | `db_handler.list_resumes` |

### 3.2 Job Description Endpoints (`app/routers/jobs.py`)

| Method | Path | Request | Response | Tool Calls |
|--------|------|---------|----------|------------|
| POST | `/api/jobs` | `JobCreateRequest` JSON | `JobResponse` | `vectorizer` → `skill_extractor` → `db_handler.save_job` |
| GET | `/api/jobs/{id}` | Path param UUID | `JobResponse` | `db_handler.get_job` |
| GET | `/api/jobs` | Query: `page`, `per_page` | `PaginatedJobs` | `db_handler.list_jobs` |

### 3.3 Scoring Endpoints (`app/routers/scoring.py`)

| Method | Path | Request | Response | Tool Calls |
|--------|------|---------|----------|------------|
| POST | `/api/score` | `ScoreRequest` (resume_id, jd_id) | `ScoreResponse` | `db_handler.get_resume` → `db_handler.get_job` → `scorer.compute_score` → `db_handler.save_score` |
| POST | `/api/score/batch` | `BatchScoreRequest` (jd_id) | `BatchScoreResponse` | For each resume: `scorer.compute_score` → sort → rank |
| GET | `/api/score/{score_id}` | Path param UUID | `ScoreResponse` | `db_handler.get_score` |

---

## 4. Pydantic Models

### 4.1 Resume Models (`app/models/resume.py`)

```python
class ResumeUploadMeta(BaseModel):
    candidate_name: str
    email: str | None = None
    phone: str | None = None

class ExperienceItem(BaseModel):
    title: str
    company: str
    start_date: str | None = None
    end_date: str | None = None
    description: str = ""

class EducationItem(BaseModel):
    degree: str
    field: str
    institution: str
    graduation_year: int | None = None

class ParsedSections(BaseModel):
    summary: str | None = None
    experience: list[ExperienceItem] = []
    education: list[EducationItem] = []
    skills: list[str] = []
    certifications: list[str] = []

class ResumeResponse(BaseModel):
    resume_id: str  # UUID
    candidate_name: str
    email: str | None
    phone: str | None
    source_format: str
    raw_text: str
    parsed_sections: ParsedSections
    skills: list[str]
    created_at: str  # ISO-8601
```

### 4.2 Job Models (`app/models/job.py`)

```python
class JobCreateRequest(BaseModel):
    title: str
    company: str | None = None
    department: str | None = None
    raw_text: str  # Full JD text
    minimum_experience_years: int | None = None
    required_education: EducationRequirement | None = None

class EducationRequirement(BaseModel):
    degree_level: str | None = None  # high_school|associate|bachelor|master|phd
    field: str | None = None

class JobResponse(BaseModel):
    jd_id: str
    title: str
    company: str | None
    department: str | None
    raw_text: str
    required_skills: list[str]
    preferred_skills: list[str]
    minimum_experience_years: int | None
    required_education: EducationRequirement | None
    created_at: str
```

### 4.3 Score Models (`app/models/score.py`)

```python
class ScoreRequest(BaseModel):
    resume_id: str
    jd_id: str

class BatchScoreRequest(BaseModel):
    jd_id: str

class ComponentScoreResponse(BaseModel):
    score: float
    weight: float
    weighted_score: float

class ScoreBreakdownResponse(BaseModel):
    semantic_similarity: ComponentScoreResponse
    skill_match: ComponentScoreResponse
    experience_relevance: ComponentScoreResponse
    education_match: ComponentScoreResponse

class PartialMatchResponse(BaseModel):
    required: str
    candidate_has: str
    similarity: float

class ScoreResponse(BaseModel):
    score_id: str
    resume_id: str
    jd_id: str
    overall_fit_score: float
    score_breakdown: ScoreBreakdownResponse
    matched_skills: list[str]
    missing_skills: list[str]
    partially_matched_skills: list[PartialMatchResponse]
    improvement_suggestions: list[str]
    computed_at: str

class RankedCandidate(BaseModel):
    rank: int
    resume_id: str
    candidate_name: str
    overall_fit_score: float
    matched_skills: list[str]
    missing_skills: list[str]

class BatchScoreResponse(BaseModel):
    jd_id: str
    total_candidates: int
    rankings: list[RankedCandidate]
    computed_at: str
```

---

## 5. Request Flow (POST `/api/resumes/upload`)

```
1. Receive UploadFile + ResumeUploadMeta via multipart form
2. Validate file format (pdf|docx|txt) — reject 422 if unsupported
3. Save file to .tmp/{uuid}.{ext}
4. Call text_extractor.extract(file_path, format)
   → If failed: return 422 with parsing error
5. Call vectorizer.embed(raw_text)
   → If failed: return 503
6. Call skill_extractor.extract(raw_text)
7. Build ResumeResponse with all data
8. Call db_handler.save_resume(resume_data)
9. Schedule .tmp/ cleanup (delete file after response)
10. Return 201 Created with ResumeResponse
```

---

## 6. Error Handling

| HTTP Code | Condition |
|-----------|-----------|
| 201 | Resource created successfully |
| 200 | Resource retrieved successfully |
| 400 | Invalid request body |
| 404 | Resume/Job/Score not found |
| 422 | File format unsupported or parsing failed |
| 500 | Internal server error |
| 503 | ML model or database unavailable |

All errors return:
```json
{"detail": "Human-readable error message"}
```

---

## 7. Middleware & Config

- **CORS**: Allow `http://localhost:3000` (React dev server)
- **Request size limit**: 10MB (from `MAX_UPLOAD_SIZE_MB`)
- **Startup event**: Pre-load embedding model on server start
- **Health check**: `GET /api/health` → `{"status": "ok", "version": "1.0.0"}`

---

## 8. Dependencies

- `fastapi>=0.109.0`
- `uvicorn>=0.27.0`
- `pydantic>=2.5.0`
- `python-multipart>=0.0.6`
- All `tools/` modules
