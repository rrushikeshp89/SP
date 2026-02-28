# Progress Log — Smart Resume Matching & Job Fit Scoring Engine

> Last Updated: 2025-06-28

---

## Session 1 — 2026-02-28

### What Was Done

| Time | Action | Result |
|------|--------|--------|
| Init | Created `task_plan.md` — Full phase checklist | ✅ Success |
| Init | Created `findings.md` — NLP/parsing/embedding research | ✅ Success |
| Init | Created `progress.md` — This file | ✅ Success |
| Init | Initialized `gemini.md` as Project Constitution | ✅ Success |
| Init | Scaffolded directory structure (`architecture/`, `tools/`, `.tmp/`) | ✅ Success |
| Init | Created `.env` template | ✅ Success |
| Init | **HALTED** — Awaiting Blueprint approval before any `tools/` code | 🔒 Enforced |

### Errors

_None so far._

### Tests

_No tests run yet — awaiting Phase 2 (Link) after Blueprint approval._

### Decisions Made

1. **Primary PDF parser**: `pdfplumber` (with PyMuPDF + Tesseract fallback chain).
2. **Primary embedding model**: `all-MiniLM-L6-v2` (local, 384-dim, fast, deterministic).
3. **Skill extraction**: Hybrid — curated taxonomy + spaCy fuzzy matching (deterministic).
4. **Scoring formula**: Weighted composite (40% semantic, 35% skills, 15% experience, 10% education).
5. **Architecture**: FastAPI backend → Pydantic validation → ML tools → PostgreSQL + Redis.

### Open Questions

1. Should the React frontend be a separate repo or monorepo?
2. Any specific ATS (Applicant Tracking System) integrations required?

---

## Session 2 — 2026-02-28 (Phase 2: Link)

### What Was Done

| Time | Action | Result |
|------|--------|--------|
| Link | Blueprint approved by user | ✅ Approved |
| Link | Installed PostgreSQL 16.11 via Chocolatey | ✅ Installed, accepting connections |
| Link | Enabled WSL2 + Virtual Machine Platform | ✅ Required reboot |
| Link | Installed Docker Desktop v29.2.1 via Chocolatey | ✅ Installed |
| Link | Rebooted system for WSL2 activation | ✅ Complete |
| Link | Started Docker Desktop engine | ✅ Engine running |
| Link | Launched Redis 7.4.8 container (`redis-resume-engine`) | ✅ Running on port 6379 |
| Link | Installed all Python dependencies (requirements.txt) | ✅ 60+ packages |
| Link | Created `.env` with all connection params | ✅ Created |
| Link | Built `tools/verify_db.py` — PostgreSQL handshake | ✅ 4/4 PASS |
| Link | Built `tools/verify_redis.py` — Redis handshake | ✅ 4/4 PASS |
| Link | Built `tools/verify_model.py` — Embedding model handshake | ✅ 4/4 PASS |
| Link | Model `all-MiniLM-L6-v2` downloaded and verified | ✅ 384D, deterministic |
| Link | Created `resume_engine` database in PostgreSQL | ✅ Created |

### Errors

_None._

### Tests (Handshake Results)

| Script | Checks | Result |
|--------|--------|--------|
| `verify_db.py` | Connectivity, version, DB create, DB connect | 4/4 PASS |
| `verify_redis.py` | PING, version, read/write cycle, memory | 4/4 PASS |
| `verify_model.py` | Imports, model load, 384D dimension, determinism | 4/4 PASS |

### Decisions Made

1. **Redis via Docker**: Redis runs as Docker container (`redis:7-alpine`) since native Windows Redis is outdated.
2. **PostgreSQL locally**: Installed natively via Chocolatey (v16.11), password = `postgres`.
3. **Local embeddings confirmed**: `all-MiniLM-L6-v2` loads in ~26s, produces deterministic 384D vectors.

### Infrastructure Summary

| Service | Version | Status | Endpoint |
|---------|---------|--------|----------|
| PostgreSQL | 16.11 | ✅ Running | localhost:5432 |
| Redis | 7.4.8 | ✅ Running (Docker) | localhost:6379 |
| Docker Desktop | 29.2.1 | ✅ Engine running | — |
| Python | 3.14.3 | ✅ Available | C:\Python314 |
| Embedding Model | all-MiniLM-L6-v2 | ✅ Loaded | 384D vectors |

---

## Session Template

### Session N — YYYY-MM-DD

| Time | Action | Result |
|------|--------|--------|
| | | |

### Errors
### Tests
### Decisions Made
---

## Session 3 — 2025-06-28

### What Was Done
- **Phase 3: Architect (3-Layer Build) — COMPLETE**

#### Layer 1: Architecture (SOPs)
- 5/5 SOPs written in `architecture/` (resume parsing, embedding, similarity, skill extraction, API routing)

#### Layer 2: Navigation (FastAPI Scaffold)
- `app/config.py` — Settings loader with database URL, taxonomy path, weight validation
- `app/models/` — 16 Pydantic v2 models (resume, job, score) with package init
- `app/routers/resumes.py` — Upload, get-by-ID, list with pagination
- `app/routers/jobs.py` — Create, get-by-ID, list with pagination
- `app/routers/scoring.py` — Single score + batch ranking
- `app/main.py` — FastAPI entry with lifespan model preload, CORS, health check

#### Layer 3: Tools
- `tools/text_extractor.py` — PDF (pdfplumber→PyMuPDF fallback), DOCX, TXT
- `tools/vectorizer.py` — Singleton model, 384-dim embeddings, normalized
- `tools/skill_extractor.py` — Taxonomy-based regex matching, 70+ skills, 7 categories
- `tools/scorer.py` — Weighted composite (semantic+skills+experience+education)
- `tools/db_handler.py` — PostgreSQL connection pool, resume + job CRUD, init_tables()
- `tools/cache_handler.py` — Redis singleton, TTL-based caching, embedding/score helpers
- `tools/data/skill_taxonomy.json` — 70+ skills in 7 categories

#### Database
- Tables `resumes` and `jobs` created in `resume_engine` database

#### Unit Tests — 50/50 PASS
| Test File | Tests | Result |
|-----------|-------|--------|
| test_text_extractor.py | 9 | 9/9 PASS |
| test_skill_extractor.py | 11 | 11/11 PASS |
| test_scorer.py | 10 | 10/10 PASS |
| test_vectorizer.py | 6 | 6/6 PASS |
| test_db_handler.py | 6 | 6/6 PASS |
| test_cache_handler.py | 8 | 8/8 PASS |

### Next Steps
- Phase 4: Stylize (React frontend + API polish)
- Phase 5: Trigger (Docker, deployment)

---

## Session 4 — 2025-06-28

### What Was Done
- **Phase 4: Stylize — COMPLETE**

#### Frontend Stack
- Vite 6 + React 18 + TypeScript, Tailwind CSS v4, Framer Motion, Recharts, Lucide React, React Dropzone, Axios
- Dark/light theme with CSS custom properties + `ThemeContext`
- API proxy: `/api` → `localhost:8000`

#### Design System
- `index.css` — Full token system (brand palette, surfaces, text, borders, status, score gradient, shadows, radii, transitions, dark mode)
- `ThemeContext.tsx` — Theme provider with localStorage + prefers-color-scheme

#### Reusable Components (7)
- `Sidebar.tsx` — Fixed nav with animated active indicator, 5 routes, theme toggle
- `Shell.tsx` — Layout + AnimatePresence page transitions
- `ScoreRing.tsx` — Animated SVG circular score (color-coded)
- `SkillBadge.tsx` — 4 variants (matched/missing/partial/neutral)
- `StatCard.tsx` — Animated stat card with icon
- `EmptyState.tsx` — Empty state placeholder
- `ScoreBar.tsx` — Horizontal score bar with weighted calculation

#### Pages (5)
- `Dashboard.tsx` — Stats, quick actions, recent activity
- `Resumes.tsx` — Drag-drop upload + searchable list with expandable details
- `Jobs.tsx` — Job creation form with skill builder + searchable list
- `Match.tsx` — 1:1 match + batch ranking with full score visualization
- `Rankings.tsx` — Batch ranking with radar chart, score breakdown, suggestions

#### Routing
- React Router v6 with Shell layout, 5 routes + redirect fallback
- `main.tsx` wrapped with ThemeProvider

#### Build
- `npm run build` — Zero errors, 830KB JS bundle + 21KB CSS

### Tests
- TypeScript: `tsc --noEmit` — 0 errors
- Vite build: ✅ 2843 modules transformed

### Next Steps
- Phase 5: Trigger (Docker, deployment, E2E testing)