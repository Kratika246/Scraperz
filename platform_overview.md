# Scraperzz — Platform Overview

Scraperzz is a competitive-intelligence and content-ops product. A team adds a brand, Next.js APIs scrape via **Bright Data Scraper Studio collectors**, Groq finds content gaps and drafts posts, and a human approves before anything is queued to publish.

**The UI only calls Next.js APIs.** Those APIs do scraping, LLM work, and Supabase writes. **n8n does not scrape or generate.** It only calls `POST /api/jobs/weekly` on a schedule.

**All scraping is Scraper Studio only.** Web Unlocker, SERP zones, and marketplace `dataset_id` scrapers are not used. Each scrape job maps to a collector ID (`c_...`) that you configure later in `.env.local`.

---

## What it does

1. **Brand context** — Scraper Studio brand-website collector (`{ url }`) returns page text; Groq fills `brands.context`.
2. **Competitor discovery** — Scraper Studio competitors collector (`{ keyword, industry, brand_name }`); the user approves or rejects each rival.
3. **Social handles** — Scraper Studio handles collector on the competitor homepage (`{ url }`).
4. **Posts** — Scraper Studio social-content collector (`{ url, platform }`), with optional LinkedIn / X collector overrides.
5. **Gap analysis** — Groq compares brand context to scraped posts (no scrape).
6. **Content generation** — Groq draft + Pollinations image, stored as `draft` (no scrape).
7. **Approval + publish** — Human approval; `POST /api/publish` queues Buffer (or a local sent job if no Buffer token).

---

## Stack

| Layer | Choice | Role |
|---|---|---|
| App | Next.js 16 + React 19 | UI and all heavy-lifting APIs |
| Auth + DB | Supabase | Multi-tenant Postgres, Auth, RLS |
| Scraping | Bright Data **Scraper Studio** | `POST /dca/trigger` + poll `GET /dca/dataset` |
| LLM | Groq (`llama-3.3-70b-versatile`) | Brand extract, gaps, drafts |
| Images | Pollinations | No API key |
| Scheduler | n8n | Weekly `POST /api/jobs/weekly` only |

Client: `lib/brightdata.ts` (`runStudioCollector`). Pipeline: `lib/pipeline.ts`.

---

## Architecture

```
UI button  ──session cookie──►  Next.js API
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
         Scraper Studio         Groq / Pollinations   Supabase
         POST /dca/trigger                            (user RLS)
         GET  /dca/dataset

n8n (Monday 09:00 or manual webhook)
      POST /api/jobs/weekly + X-Webhook-Secret
              │
              ▼
      Next.js (service role) runs the same API pipeline
      (still only Scraper Studio for scrape steps)
```

n8n never calls Bright Data or Groq. If n8n is down, the dashboard still works.

Health: `GET /api/health` (includes which collector IDs are set).

---

## Scraper Studio collectors

Copy each collector ID from Scraper Studio (starts with `c_`) into `.env.local`. The collector **Inputs** tab must match the payload we send.

| Env var | Used by | Input payload | Flexible output fields |
|---|---|---|---|
| `BRIGHTDATA_API_KEY` | All collectors | Bearer token | — |
| `BRIGHTDATA_COLLECTOR_BRAND_WEBSITE` | `POST /api/brands` | `{ url }` | `text` / `markdown` / `html` / `title` / `description` |
| `BRIGHTDATA_COLLECTOR_COMPETITORS` | Discover competitors | `{ keyword, industry, brand_name }` | `name`, `website_url` / `url` / `link` |
| `BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES` | Find handles | `{ url }` | `platform`, `handle`, `profile_url` or `linkedin_url`, `twitter_url`, … |
| `BRIGHTDATA_COLLECTOR_SOCIAL_CONTENT` | Scrape posts | `{ url, platform }` | `post_text` / `text`, `posted_at`, likes/comments |
| `BRIGHTDATA_COLLECTOR_LINKEDIN_POSTS` | Optional override | `{ url }` | same as social content |
| `BRIGHTDATA_COLLECTOR_X_POSTS` | Optional override | `{ url }` | same as social content |
| `BRIGHTDATA_COLLECTOR_VERSION` | Optional | `dev` to hit the draft collector | — |

Runtime:

1. `POST https://api.brightdata.com/dca/trigger?collector=c_...&queue_next=1`
2. Read `collection_id` (`j_...`)
3. Poll `GET https://api.brightdata.com/dca/dataset?id=j_...` until the body is a JSON array (up to ~180s)

If a collector ID is missing, the API returns an error telling you which env var to set. There is no Unlocker/SERP fallback.

---

## Product surfaces

| Route | Purpose | API |
|---|---|---|
| `/dashboard` | Counts | Supabase reads |
| `/dashboard/brands/new` | Create brand | `POST /api/brands` |
| `/dashboard/product` | Brand context | `GET` brands |
| `/dashboard/competitors` | Discover, approve, handles, posts | discover / find-handles / scrape-content |
| `/dashboard/intelligence` | Post feed | `GET /api/intelligence` |
| `/dashboard/opportunities` | Gap analysis | `POST /api/brands/:id/analyze-gaps` |
| `/dashboard/content` | Generate drafts | `POST /api/brands/:id/generate-content` |
| `/dashboard/approvals` | Approve + publish | PATCH + `POST /api/publish` |

---

## APIs (heavy lifting)

| Method | Path | Who scrapes / thinks |
|---|---|---|
| POST | `/api/brands` | Scraper Studio `BRAND_WEBSITE` + Groq |
| POST | `/api/brands/:id/discover-competitors` | Scraper Studio `COMPETITORS` |
| POST | `/api/competitors/:id/find-handles` | Scraper Studio `SOCIAL_HANDLES` |
| POST | `/api/competitors/:id/scrape-content` | Scraper Studio `SOCIAL_CONTENT` or LinkedIn/X override |
| POST | `/api/brands/:id/analyze-gaps` | Groq |
| POST | `/api/brands/:id/generate-content` | Groq + Pollinations |
| POST | `/api/publish` | Buffer or queued |
| POST | `/api/jobs/weekly` | Secret; same scrape collectors + analyze + one draft per ready brand |

Callback routes are gone. Manual UI buttons hit the feature APIs; n8n only hits `/api/jobs/weekly`.

---

## n8n (scheduler only)

File: `n8n_workflows/weekly_refresh.json`

- Schedule: every Monday 09:00
- Optional webhook: `POST /webhook/weekly-refresh`
- Both call `POST {NEXTJS_APP_URL}/api/jobs/weekly` with `X-Webhook-Secret`

Import and activate that one workflow. Docker: `docker compose up` → http://localhost:5678

Weekly job, for each `brands.status = ready`:

1. Approved competitors → Scraper Studio handles + posts
2. Gap analysis (Groq)
3. One LinkedIn draft from the top topic

---

## Data model

| Table | Role |
|---|---|
| `tenants` / `profiles` | Workspace + user |
| `brands` | Context JSON, scrape status |
| `competitors` | `discovered` / `approved` / `rejected` |
| `competitor_social_handles` | Platform + URL |
| `competitor_content` | Scraped posts |
| `gap_analysis_reports` | Findings JSON |
| `generated_content` | Drafts |
| `publish_jobs` | Queue |

RLS: tenant members on user APIs. Weekly job uses the service role.

---

## Local run

1. Fill `.env.local`: Supabase, `GROQ_API_KEY`, `BRIGHTDATA_API_KEY`, and Scraper Studio collector IDs (`c_...`).
2. `pnpm dev` — http://localhost:3000
3. Optional: `docker compose up`, import `weekly_refresh.json`, activate it.
4. Demo: add brand → My Product → Discover → Approve → Find handles → Scrape posts → Intelligence → Run analysis → Generate → Approve.

Confirm rows in Supabase after each click. Collector runs often take 30–180 seconds (API `maxDuration` is 120s on scrape routes; weekly job is 300s).
