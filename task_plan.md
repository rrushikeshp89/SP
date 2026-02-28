# Task Plan — Smart Resume Matching & Job Fit Scoring Engine

> Status: **PHASE 4 — STYLIZE (Complete) → Ready for Phase 5**
> Last Updated: 2025-06-28

---

## North Star

A deterministic system that ingests resumes (PDF/DOCX/text) and job descriptions,
computes real match scores via NLP embeddings + cosine similarity, surfaces missing
skills, and ranks candidates—served through a FastAPI backend to a React recruiter
dashboard.

---

## Phase 0: Initialization ✅

| # | Task | Status |
|---|------|--------|
| 0.1 | Create `task_plan.md` | ✅ Done |
| 0.2 | Create `findings.md` | ✅ Done |
| 0.3 | Create `progress.md` | ✅ Done |
| 0.4 | Initialize `gemini.md` as Project Constitution (schemas, rules, invariants) | ✅ Done |
| 0.5 | Scaffold directory structure (`architecture/`, `tools/`, `.tmp/`) | ✅ Done |
| 0.6 | Create `.env` template | ✅ Done |
| 0.7 | **HALT** — No scripts in `tools/` until Blueprint is approved | 🔒 Enforced |

---

## Phase 1: B — Blueprint (Vision & Logic)

| # | Task | Status |
|---|------|--------|
| 1.1 | Define JSON Data Schemas in `gemini.md` (Resume, JD, Score Output) | ✅ Done |
| 1.2 | Research resume parsing libraries (spaCy, PyPDF2, pdfplumber, python-docx) | ✅ Done |
| 1.3 | Research embedding strategies (sentence-transformers, OpenAI ada-002) | ✅ Done |
| 1.4 | Research cosine similarity + skill extraction approaches | ✅ Done |
| 1.5 | Document findings in `findings.md` | ✅ Done |
| 1.6 | **⏸ AWAIT USER APPROVAL of Blueprint before Phase 2** | ✅ Approved |

---

## Phase 2: L — Link (Connectivity)

| # | Task | Status |
|---|------|--------|
| 2.1 | Verify local PostgreSQL connection | ✅ Done — v16.11, port 5432 |
| 2.2 | Verify local Redis connection | ✅ Done — v7.4.8 (Docker), port 6379 |
| 2.3 | Validate `.env` credentials for NLP APIs | ✅ Done — local model, no API needed |
| 2.4 | Build `tools/verify_db.py` handshake script | ✅ Done — 4/4 PASS |
| 2.5 | Build `tools/verify_redis.py` handshake script | ✅ Done — 4/4 PASS |
| 2.6 | Build `tools/verify_model.py` embedding model load check | ✅ Done — 4/4 PASS |

---

## Phase 3: A — Architect (3-Layer Build)

| # | Task | Status |
|---|------|--------|
| 3.1 | Write SOP: Resume Parsing (`architecture/sop_resume_parsing.md`) | ✅ Done |
| 3.2 | Write SOP: Embedding Generation (`architecture/sop_embedding.md`) | ✅ Done |
| 3.3 | Write SOP: Cosine Similarity (`architecture/sop_similarity.md`) | ✅ Done |
| 3.4 | Write SOP: Skill Extraction (`architecture/sop_skill_extraction.md`) | ✅ Done |
| 3.5 | Write SOP: API Routing (`architecture/sop_api_routing.md`) | ✅ Done |
| 3.6 | Build FastAPI app scaffold with Pydantic models | ✅ Done |
| 3.7 | Build `tools/text_extractor.py` (PDF/DOCX → plain text) | ✅ Done |
| 3.8 | Build `tools/vectorizer.py` (text → embedding vectors) | ✅ Done |
| 3.9 | Build `tools/scorer.py` (cosine similarity + weighted scoring) | ✅ Done |
| 3.10 | Build `tools/skill_extractor.py` (NER / keyword matching) | ✅ Done |
| 3.11 | Build `tools/db_handler.py` (PostgreSQL CRUD) | ✅ Done |
| 3.12 | Build `tools/cache_handler.py` (Redis caching layer) | ✅ Done |
| 3.13 | Write unit tests for each tool | ✅ Done — 50/50 PASS |

---

## Phase 4: S — Stylize (Refinement & UI)

| # | Task | Status |
|---|------|--------|
| 4.1 | Finalize API response payloads (clean JSON) | ✅ Done — Pydantic models match frontend types |
| 4.2 | Scaffold React frontend (Recruiter Dashboard) | ✅ Done — Vite 6 + React 18 + TypeScript |
| 4.3 | Build candidate ranking table component | ✅ Done — Rankings page with radar chart |
| 4.4 | Build skill gap visualization component | ✅ Done — ScoreRing, ScoreBar, SkillBadge |
| 4.5 | Build resume upload + JD input form | ✅ Done — Drag-drop upload, job creation form |
| 4.6 | Apply accessible CSS/HTML styling | ✅ Done — Design tokens, dark mode, animations |
| 4.7 | Present mockups for feedback | ✅ Done — Build verified, ready for review |

---

## Phase 5: T — Trigger (Deployment)

| # | Task | Status |
|---|------|--------|
| 5.1 | Write Dockerfiles (backend, frontend, Postgres, Redis) | ⬜ Not Started |
| 5.2 | Write `docker-compose.yml` | ⬜ Not Started |
| 5.3 | Configure AWS deployment (ECS/EC2) | ⬜ Not Started |
| 5.4 | Set up DB indexing for candidate queries | ⬜ Not Started |
| 5.5 | Set up Redis caching for frequent JDs | ⬜ Not Started |
| 5.6 | Finalize Maintenance Log in `gemini.md` | ⬜ Not Started |
| 5.7 | End-to-end integration test | ⬜ Not Started |
