# Findings — NLP, Embeddings, Parsing & Scoring Research

> Last Updated: 2026-02-28

---

## 1. Resume Parsing Libraries

### 1.1 PDF Extraction

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **PyPDF2** | Lightweight, pure Python, widely used | Poor on complex layouts, images, scanned docs | Baseline fallback |
| **pdfplumber** | Excellent table/layout extraction, coordinates-aware | Slightly heavier than PyPDF2 | **Primary choice** for structured PDFs |
| **pdfminer.six** | Low-level control, good text positioning | Verbose API, slower | Use when pdfplumber fails |
| **PyMuPDF (fitz)** | Very fast, handles images, metadata | C dependency | Fast-path for large volumes |
| **Tesseract (OCR)** | Handles scanned/image PDFs | Requires system install, slower | Fallback for image-only PDFs |

### 1.2 DOCX Extraction

| Library | Notes |
|---------|-------|
| **python-docx** | Standard for .docx parsing; handles paragraphs, tables, styles. Primary choice. |
| **docx2txt** | Simpler API, also extracts images. Good lightweight alternative. |

### 1.3 Parsing Strategy

```
Input (PDF/DOCX/TXT)
  │
  ├─ PDF → pdfplumber (primary) → PyMuPDF (fallback) → Tesseract OCR (last resort)
  ├─ DOCX → python-docx
  └─ TXT → direct read (UTF-8)
  │
  ▼
Raw Text (stored in .tmp/ for processing)
```

**Key constraint**: Resumes are wildly inconsistent—multi-column layouts, tables, headers/footers, graphics. The parser must extract text in reading order and degrade gracefully.

---

## 2. NLP Embedding Models

### 2.1 Sentence Transformers (Local / HuggingFace)

| Model | Dimensions | Speed | Quality | Notes |
|-------|-----------|-------|---------|-------|
| `all-MiniLM-L6-v2` | 384 | Fast | Good | Best speed/quality tradeoff for production |
| `all-mpnet-base-v2` | 768 | Medium | Excellent | Higher accuracy, recommended if latency allows |
| `multi-qa-MiniLM-L6-cos-v1` | 384 | Fast | Good | Optimized for Q&A / semantic search |
| `BAAI/bge-large-en-v1.5` | 1024 | Slow | State-of-art | Top retrieval quality; heavy |

### 2.2 API-Based (OpenAI)

| Model | Dimensions | Cost | Notes |
|-------|-----------|------|-------|
| `text-embedding-3-small` | 1536 | $0.02/1M tokens | Good balance |
| `text-embedding-3-large` | 3072 | $0.13/1M tokens | Highest quality |
| `text-embedding-ada-002` | 1536 | $0.10/1M tokens | Legacy, still solid |

### 2.3 Embedding Strategy

**Primary**: `all-MiniLM-L6-v2` via `sentence-transformers` (local, no API cost, fast, 384-dim).
**Upgrade path**: Swap to `all-mpnet-base-v2` or OpenAI `text-embedding-3-small` if quality benchmarks require it.
**Determinism**: Same text → same vector every time (temperature=0, no sampling). Models are deterministic at inference for embeddings.

---

## 3. Cosine Similarity Scoring

### 3.1 Core Formula

$$
\text{similarity}(A, B) = \frac{A \cdot B}{\|A\| \times \|B\|}
$$

Where $A$ = resume embedding vector, $B$ = job description embedding vector.

- Output range: $[-1, 1]$ (in practice $[0, 1]$ for text embeddings)
- Threshold calibration needed: typically $\geq 0.70$ = strong match, $0.50\text{–}0.69$ = moderate, $< 0.50$ = weak

### 3.2 Scoring Architecture

The final **Job Fit Score** is a weighted composite:

| Component | Weight | Method |
|-----------|--------|--------|
| Semantic Similarity (full doc) | 40% | Cosine similarity of full resume vs. full JD embeddings |
| Skill Match Ratio | 35% | `matched_skills / required_skills` |
| Experience Relevance | 15% | Keyword/NER extraction of years + domain overlap |
| Education Match | 10% | Rule-based (degree level, field match) |

$$
\text{FitScore} = 0.40 \cdot S_{\text{semantic}} + 0.35 \cdot S_{\text{skills}} + 0.15 \cdot S_{\text{experience}} + 0.10 \cdot S_{\text{education}}
$$

Final score normalized to $[0, 100]$.

### 3.3 Implementation

Use `numpy` or `scipy.spatial.distance.cosine` for vector math. For batch scoring with many candidates, use matrix multiplication with `numpy` for O(n) efficiency instead of pairwise loops.

---

## 4. Skill Extraction

### 4.1 Approaches

| Method | Pros | Cons |
|--------|------|------|
| **spaCy NER** | Fast, trainable, offline | Generic NER doesn't know tech skills |
| **Custom skill taxonomy** | Precise, deterministic | Requires maintenance of skill list |
| **SkillNER / spaCy + skillNer** | Purpose-built skill extraction | Smaller community, may need fine-tuning |
| **LLM-based extraction** | Flexible, handles novel skills | Non-deterministic, costly |

### 4.2 Recommended Strategy

**Hybrid approach**:
1. Maintain a **curated skill taxonomy** (JSON/CSV) of ~2000 tech + soft skills, organized by category.
2. Use **spaCy tokenizer + fuzzy matching** against the taxonomy for deterministic extraction.
3. Optional upgrade: Use a fine-tuned NER model for novel skill detection.

This ensures determinism (same resume → same skill list every time).

### 4.3 Skill Taxonomy Structure

```json
{
  "programming_languages": ["Python", "JavaScript", "TypeScript", "Java", "C++", ...],
  "frameworks": ["React", "FastAPI", "Django", "Spring Boot", ...],
  "databases": ["PostgreSQL", "MongoDB", "Redis", "MySQL", ...],
  "cloud": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", ...],
  "soft_skills": ["Leadership", "Communication", "Problem Solving", ...],
  "tools": ["Git", "Jira", "Figma", "Terraform", ...]
}
```

---

## 5. Key Constraints & Risks

| Risk | Mitigation |
|------|------------|
| Scanned/image PDFs failing text extraction | Tesseract OCR fallback pipeline |
| Multi-column resume layouts | pdfplumber's coordinate-aware extraction |
| Embedding model drift across versions | Pin model version in requirements; store model hash |
| Skill taxonomy gaps | Quarterly review + user feedback loop to add missing skills |
| API rate limits (OpenAI) | Local model as primary; API as optional upgrade |
| Non-English resumes | Detect language; use multilingual model (`paraphrase-multilingual-MiniLM-L12-v2`) |

---

## 6. Key Dependencies (Python)

```
fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.5.0
sentence-transformers>=2.3.0
spacy>=3.7.0
pdfplumber>=0.10.0
PyMuPDF>=1.23.0
python-docx>=1.1.0
numpy>=1.26.0
scipy>=1.12.0
psycopg2-binary>=2.9.9
redis>=5.0.0
python-multipart>=0.0.6
python-dotenv>=1.0.0
```
