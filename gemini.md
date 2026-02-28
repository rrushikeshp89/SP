# gemini.md — Project Constitution
## Smart Resume Matching & Job Fit Scoring Engine

> Version: 1.0.0
> Created: 2026-02-28
> Status: **BLUEPRINT — Awaiting Approval**

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Name | Smart Resume Matching & Job Fit Scoring Engine |
| Protocol | B.L.A.S.T. (Blueprint → Link → Architect → Stylize → Trigger) |
| Architecture | A.N.T. 3-Layer (Architecture / Navigation / Tools) |
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18+ (TypeScript) |
| Database | PostgreSQL 16 |
| Cache | Redis 7+ |
| ML Runtime | sentence-transformers (local) — OpenAI API (optional) |
| Deployment | Docker → AWS (ECS/EC2) |

---

## 2. Data Schemas (Source of Truth)

All tool code MUST conform to these schemas. Any schema change requires updating this section first.

### 2.1 Resume Input Payload

```json
{
  "resume_id": "uuid-v4",
  "candidate_name": "string",
  "email": "string | null",
  "phone": "string | null",
  "source_format": "pdf | docx | txt",
  "raw_text": "string (extracted full text)",
  "parsed_sections": {
    "summary": "string | null",
    "experience": [
      {
        "title": "string",
        "company": "string",
        "start_date": "YYYY-MM | null",
        "end_date": "YYYY-MM | present | null",
        "description": "string"
      }
    ],
    "education": [
      {
        "degree": "string",
        "field": "string",
        "institution": "string",
        "graduation_year": "integer | null"
      }
    ],
    "skills": ["string"],
    "certifications": ["string"]
  },
  "embedding_vector": [0.0, "... (384 floats for MiniLM)"],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### 2.2 Job Description Input Payload

```json
{
  "jd_id": "uuid-v4",
  "title": "string",
  "company": "string | null",
  "department": "string | null",
  "raw_text": "string (full job description text)",
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "minimum_experience_years": "integer | null",
  "required_education": {
    "degree_level": "high_school | associate | bachelor | master | phd | null",
    "field": "string | null"
  },
  "embedding_vector": [0.0, "... (384 floats for MiniLM)"],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### 2.3 Fit Score Output Payload

```json
{
  "score_id": "uuid-v4",
  "resume_id": "uuid-v4",
  "jd_id": "uuid-v4",
  "overall_fit_score": 78.5,
  "score_breakdown": {
    "semantic_similarity": {
      "score": 82.3,
      "weight": 0.40,
      "weighted_score": 32.92
    },
    "skill_match": {
      "score": 71.4,
      "weight": 0.35,
      "weighted_score": 24.99
    },
    "experience_relevance": {
      "score": 80.0,
      "weight": 0.15,
      "weighted_score": 12.00
    },
    "education_match": {
      "score": 85.0,
      "weight": 0.10,
      "weighted_score": 8.50
    }
  },
  "matched_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
  "missing_skills": ["Kubernetes", "Terraform", "GraphQL"],
  "partially_matched_skills": [
    {
      "required": "React",
      "candidate_has": "Vue.js",
      "similarity": 0.72
    }
  ],
  "improvement_suggestions": [
    "Consider obtaining Kubernetes certification to close the infrastructure skill gap.",
    "Add Terraform experience — many similar roles list it as required."
  ],
  "rank": 3,
  "total_candidates": 12,
  "computed_at": "ISO-8601"
}
```

---

## 3. Behavioral Rules (Invariants)

These rules are ABSOLUTE. Every script, endpoint, and component must obey them.

### 3.1 Determinism

| Rule | Enforcement |
|------|-------------|
| Same resume text → same embedding vector | Pin model version; no sampling/temperature in embedding inference |
| Same (resume, JD) pair → same fit score | No randomness in cosine similarity or weighted scoring |
| Skill extraction is taxonomy-based | Curated skill list + fuzzy match; no LLM-based extraction in core path |
| Score weights are configurable but static per run | Weights stored in config; do not change mid-batch |

### 3.2 Strict Typing

| Rule | Enforcement |
|------|-------------|
| All API inputs validated via Pydantic v2 models | FastAPI dependency injection |
| All DB writes use parameterized queries | psycopg2 / SQLAlchemy with bound params |
| Embedding vectors are `list[float]` with fixed dimensionality | Assert `len(vector) == MODEL_DIM` before storage |
| Scores are `float` in range `[0.0, 100.0]` | Clamp + validate before API response |

### 3.3 Error Handling

| Scenario | Behavior |
|----------|----------|
| PDF extraction fails | Fall back to PyMuPDF → Tesseract OCR → return error with `parsing_failed` flag |
| Embedding model fails to load | Block startup; return 503 Service Unavailable |
| DB connection lost | Retry 3× with exponential backoff → circuit-break → 503 |
| Redis unavailable | Degrade gracefully — bypass cache, serve from DB |
| Unknown file format | Return 422 with supported formats list |

### 3.4 Data Boundaries

| Data Type | Location | Lifetime |
|-----------|----------|----------|
| Uploaded PDFs/DOCX | `.tmp/` | Deleted after processing (max 1 hour) |
| Extracted raw text | `.tmp/` → then DB | Transient in `.tmp/`, permanent in PostgreSQL |
| Embedding vectors | PostgreSQL (`pgvector` extension) | Permanent |
| Fit scores | PostgreSQL | Permanent |
| Cached JD embeddings | Redis | TTL: 24 hours |
| Skill taxonomy | `tools/data/skill_taxonomy.json` | Version-controlled |

---

## 4. Architectural Invariants (A.N.T. 3-Layer)

```
┌─────────────────────────────────────────────────┐
│  Layer 1: ARCHITECTURE  (architecture/)          │
│  SOPs, decision docs, schema definitions         │
│  → Updated BEFORE code changes                   │
├─────────────────────────────────────────────────┤
│  Layer 2: NAVIGATION  (app/, routers/)           │
│  FastAPI routes, Pydantic validation,            │
│  request/response orchestration                  │
│  → Deterministic routing; no ML logic here       │
├─────────────────────────────────────────────────┤
│  Layer 3: TOOLS  (tools/)                        │
│  Text extractors, vectorizers, scorers,          │
│  DB handlers, cache handlers                     │
│  → Pure functions; testable in isolation         │
└─────────────────────────────────────────────────┘
```

### Invariant Rules

1. **SOP-First**: No tool script is written or modified without the corresponding SOP being updated first.
2. **Layer Isolation**: Navigation layer (FastAPI routes) NEVER imports ML models directly — only calls tool functions.
3. **Tool Purity**: Every tool function takes explicit inputs and returns explicit outputs. No global state. No side effects except DB/cache writes through dedicated handlers.
4. **Schema Conformance**: All API responses conform to the schemas in Section 2 of this document.
5. **Testability**: Every tool has a corresponding unit test. Mocking DB/Redis is mandatory in tests.

---

## 5. File Structure

```
d:\SP\
├── gemini.md              # THIS FILE — Project Constitution
├── task_plan.md           # Phase checklist & progress tracking
├── findings.md            # Research notes (NLP, parsing, embeddings)
├── progress.md            # Session log (actions, errors, tests)
├── .env                   # API keys & connection strings (git-ignored)
├── .gitignore             # Standard Python + Node ignores
│
├── architecture/          # Layer 1: SOPs
│   ├── sop_resume_parsing.md
│   ├── sop_embedding.md
│   ├── sop_similarity.md
│   ├── sop_skill_extraction.md
│   └── sop_api_routing.md
│
├── app/                   # Layer 2: Navigation (FastAPI)
│   ├── main.py            # FastAPI app entry
│   ├── routers/
│   │   ├── resumes.py     # /api/resumes endpoints
│   │   ├── jobs.py        # /api/jobs endpoints
│   │   └── scoring.py     # /api/score endpoints
│   ├── models/            # Pydantic schemas
│   │   ├── resume.py
│   │   ├── job.py
│   │   └── score.py
│   └── config.py          # Settings from .env
│
├── tools/                 # Layer 3: Deterministic Scripts
│   ├── text_extractor.py  # PDF/DOCX → plain text
│   ├── vectorizer.py      # Text → embedding vectors
│   ├── scorer.py          # Cosine similarity + weighted scoring
│   ├── skill_extractor.py # Taxonomy-based skill extraction
│   ├── db_handler.py      # PostgreSQL CRUD operations
│   ├── cache_handler.py   # Redis caching layer
│   ├── verify_db.py       # DB connection handshake
│   ├── verify_redis.py    # Redis connection handshake
│   ├── verify_model.py    # Embedding model load check
│   └── data/
│       └── skill_taxonomy.json
│
├── tests/                 # Unit & integration tests
│   ├── test_text_extractor.py
│   ├── test_vectorizer.py
│   ├── test_scorer.py
│   ├── test_skill_extractor.py
│   └── test_api.py
│
├── frontend/              # React Recruiter Dashboard
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .tmp/                  # Temporary processing workbench
│
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── requirements.txt
```

---

## 6. Scoring Formula

$$
\text{FitScore} = 0.40 \cdot S_{\text{semantic}} + 0.35 \cdot S_{\text{skills}} + 0.15 \cdot S_{\text{experience}} + 0.10 \cdot S_{\text{education}}
$$

Each component is scored on $[0, 100]$. The final score is clamped to $[0, 100]$.

| Component | Method |
|-----------|--------|
| $S_{\text{semantic}}$ | Cosine similarity of full-doc embeddings × 100 |
| $S_{\text{skills}}$ | `len(matched) / len(required) × 100` (with partial credit for similar skills) |
| $S_{\text{experience}}$ | Years overlap + domain keyword match, normalized to 100 |
| $S_{\text{education}}$ | Rule-based: degree level match (50pts) + field match (50pts) |

---

## 7. API Endpoints (Blueprint)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resumes/upload` | Upload PDF/DOCX, extract text, generate embedding, store |
| GET | `/api/resumes/{id}` | Retrieve parsed resume |
| GET | `/api/resumes` | List all candidates (paginated) |
| POST | `/api/jobs` | Create job description, extract skills, generate embedding |
| GET | `/api/jobs/{id}` | Retrieve job description |
| GET | `/api/jobs` | List all job descriptions (paginated) |
| POST | `/api/score` | Score one resume against one JD |
| POST | `/api/score/batch` | Score all resumes against one JD, return ranked list |
| GET | `/api/score/{score_id}` | Retrieve a previously computed score |

---

## 8. Maintenance Log

_To be populated during Phase 5 (Trigger)._

| Date | Change | Impact | Author |
|------|--------|--------|--------|
| | | | |
