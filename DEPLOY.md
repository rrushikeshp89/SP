# Tesseract — Free Cloud Deployment Guide

Deploy Tesseract to the cloud for **$0/month** using four free-tier services:

| Component | Platform | Free Tier Limits |
|-----------|----------|-----------------|
| **Frontend** | [Vercel](https://vercel.com) | Unlimited deploys, 100 GB bandwidth/mo |
| **Backend** | [Render](https://render.com) | 750 hrs/mo, sleeps after 15 min inactivity |
| **Database** | [Neon](https://neon.tech) | 0.5 GB storage, autosuspend after 5 min idle |
| **Cache** | [Upstash](https://upstash.com) | 10K commands/day, 256 MB (optional) |

> **Cold starts**: The Render free tier spins down after 15 minutes of no traffic.
> The first request after sleep takes ~30-60 seconds while the ML model reloads.
> Subsequent requests are fast. This is the only trade-off for a fully free deployment.

---

## Prerequisites

- A **GitHub** account (all platforms deploy from GitHub)
- Push the Tesseract repo to a GitHub repository

---

## Step 1 — Create Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) → **Sign Up** (use GitHub SSO)
2. Click **Create Project**
   - Name: `tesseract`
   - Region: pick the one closest to you (e.g. `us-east-2`)
   - PostgreSQL version: 16
3. Copy your **connection string** — it looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Open the **SQL Editor** in the Neon dashboard and paste the contents of `init.sql` to create the tables:
   - Copy everything from `init.sql` in the repo
   - Paste into the SQL Editor and click **Run**
   - You should see all 4 tables created (resumes, jobs, score_history, scoring_profiles)

> **Save the connection string** — you'll need it for Render in Step 3.

---

## Step 2 — Create Upstash Redis (Optional)

Redis caching is **optional** — the app works perfectly without it (just no score/embedding caching).
If you want caching:

1. Go to [upstash.com](https://upstash.com) → **Sign Up** (use GitHub SSO)
2. Click **Create Database**
   - Name: `tesseract-cache`
   - Region: same region as your Neon DB
   - Type: **Regional**
   - Enable TLS: **Yes** (default)
3. Go to the database details → copy the **Redis URL** (starts with `rediss://`)

> **Note**: If you skip this step, leave `REDIS_URL` empty in Render — the app gracefully falls back to no caching.

---

## Step 3 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → **Sign Up** (use GitHub SSO)
2. Click **New** → **Web Service**
3. Connect your GitHub repo containing Tesseract
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `tesseract-backend` |
   | **Region** | Same as your Neon DB |
   | **Runtime** | **Docker** |
   | **Dockerfile Path** | `./Dockerfile.backend` |
   | **Instance Type** | **Free** |

5. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(paste your Neon connection string from Step 1)* |
   | `REDIS_URL` | *(paste your Upstash Redis URL from Step 2, or leave empty)* |
   | `WORKERS` | `1` |

6. Click **Create Web Service**

   > The first build takes ~8-12 minutes (downloads PyTorch + ML model).
   > Subsequent deploys are faster thanks to Docker layer caching.

7. Once deployed, note your backend URL:
   ```
   https://tesseract-backend.onrender.com
   ```
   Verify by visiting `https://tesseract-backend.onrender.com/health` — you should see:
   ```json
   {"status": "healthy", "model": "all-MiniLM-L6-v2"}
   ```

---

## Step 4 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign Up** (use GitHub SSO)
2. Click **Add New** → **Project**
3. Import your GitHub repo containing Tesseract
4. Configure the project:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

5. Add **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://tesseract-backend.onrender.com` *(your Render URL from Step 3)* |

   > **Important**: No trailing slash! The URL should be the bare domain.

6. Click **Deploy**

   > Build takes ~1-2 minutes. Once done, Vercel gives you a URL like:
   > `https://tesseract-xyz.vercel.app`

7. Open your Vercel URL — you should see the Tesseract dashboard!

---

## Step 5 — Verify Everything Works

1. **Dashboard**: Open your Vercel URL → stats should load (may take 30-60s on first hit if backend is cold)
2. **Upload Resume**: Go to Resumes → drag-drop a PDF/DOCX/TXT file
3. **Create Job**: Go to Jobs → create a job description
4. **Score Match**: Go to Match → select a resume and job → click Score
5. **Rankings**: Go to Rankings → select a job → batch score all resumes

---

## Continuous Upgrades

Both Vercel and Render support **auto-deploy from GitHub**:

1. Make changes locally
2. Push to your `main` branch
3. Both platforms automatically rebuild and deploy

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

> Vercel deploys in ~1-2 minutes. Render rebuilds the Docker image in ~5-8 minutes.

### Preview Deployments (Vercel)

Every pull request gets a unique preview URL automatically — great for testing changes before merging to main.

---

## Custom Domain (Optional, Still Free)

### Vercel (Frontend)
1. Go to your Vercel project → **Settings** → **Domains**
2. Add your custom domain (e.g., `tesseract.yourdomain.com`)
3. Update DNS records as instructed
4. SSL is provisioned automatically

### Render (Backend)
1. Go to your Render service → **Settings** → **Custom Domains**
2. Add your API domain (e.g., `api.tesseract.yourdomain.com`)
3. Update DNS records as instructed
4. Update the `VITE_API_URL` in Vercel to point to your new API domain

---

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐
│   Browser    │ ──────▶ │   Vercel (CDN)   │
│              │ ◀────── │   React Frontend  │
└─────────────┘         └──────────────────┘
       │                        
       │ HTTPS (direct)         
       ▼                        
┌──────────────────┐    ┌──────────────────┐
│   Render (Free)  │───▶│  Neon PostgreSQL  │
│   FastAPI + ML   │    │  (Free, 0.5 GB)  │
│   Backend        │    └──────────────────┘
└──────────────────┘    
       │                 
       │ (optional)      
       ▼                 
┌──────────────────┐    
│  Upstash Redis   │    
│  (Free, 10K/day) │    
└──────────────────┘    
```

The frontend calls the backend directly (no proxy) — CORS is configured to allow all origins.

---

## Troubleshooting

### Backend returns 502 or takes long to respond
The Render free tier **sleeps after 15 minutes of inactivity**. The first request wakes it up (cold start: ~30-60s). Just wait and retry.

### "Connection refused" errors in browser console
- Verify `VITE_API_URL` in Vercel matches your Render URL exactly
- Check the Render dashboard to confirm the service is running
- Visit `https://YOUR-RENDER-URL/health` directly to verify

### Database connection errors in Render logs
- Verify `DATABASE_URL` is correct in Render environment variables
- Make sure you ran `init.sql` in the Neon SQL Editor (Step 1.4)
- Check that the Neon project hasn't been suspended (free tier auto-suspends after inactivity, but auto-resumes on connection)

### Upload fails or scoring times out
- Render free tier has limited CPU — scoring may take 15-30s per resume
- Large files (>5 MB) may hit memory limits — keep resumes under 5 MB

### Redis connection errors
- These are non-fatal — the app works without Redis
- If using Upstash, make sure the `REDIS_URL` starts with `rediss://` (double s = TLS)

---

## Cost Summary

| Service | Monthly Cost | Limits |
|---------|-------------|--------|
| Vercel | **$0** | 100 GB bandwidth, unlimited deploys |
| Render | **$0** | 750 hrs, sleeps after 15min idle |
| Neon | **$0** | 0.5 GB storage, auto-suspend |
| Upstash | **$0** | 10K commands/day, 256 MB |
| **Total** | **$0/month** | |

When you outgrow the free tiers, the cheapest paid upgrade is Render Starter ($7/mo) for always-on backend — everything else stays free for a long time.
