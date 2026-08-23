# Scraperzz — Platform Overview

Scraperzz is a competitive-intelligence and content-ops product. A team adds a brand, Next.js APIs scrape via **Bright Data** (SERP API for competitor discovery, dataset scrapers for LinkedIn/X, Scraper Studio collectors for brand websites & handles, and blog HTML parsers), Groq performs competitive gap analysis and drafts blog articles & social posts, and a human approves before anything is queued to publish.

**The UI only calls Next.js APIs.** Those APIs do scraping, LLM work, and Supabase writes. **n8n does not scrape or generate.** It only calls `POST /api/jobs/weekly` on a schedule.

---

## What it does

1. **Brand context** — Scraper Studio brand-website collector (`{ url }`) returns page text; Groq fills `brands.context`.
2. **Competitor discovery** — Bright Data **SERP API** (`POST /request`, `brd_json=1`): fires Google searches (`"<brand>" competitors alternatives <industry>` + `best <industry> tools alternative to "<brand>"`), extracts organic results, deduplicates by domain, filters aggregators/social sites, scores by position.
3. **Social handles** — Scraper Studio handles collector or DOM/HTML parser on the competitor homepage (`{ url }`). Normalizes platform values (`linkedin`, `twitter`, `instagram`, `facebook`, `youtube`, `tiktok`, `other`) for DB check constraint safety.
4. **Competitor content & blog scraping** — Scrapes competitor social posts (LinkedIn datasets, X datasets) and blog articles (`scrapeBrandBlog` / `runScrapeBlog`), inserting into `competitor_content`.
5. **Gap analysis** — Groq compares brand context against collected competitor posts & blog articles to uncover content gaps, strategic positioning insights, recommended topics, and target content formats.
6. **Multi-format content generation** — Groq generates high-quality **Blog Articles** (structured markdown with H1, executive summary, key sections, takeaways, CTA) and **Social Posts** (LinkedIn, Twitter/X, Instagram, Facebook) paired with Pollinations graphic headers.
7. **Approval & publishing** — Human review in Approval Center; `POST /api/publish` queues Buffer (or local queue).

---

## Self-Healing Scraper Architecture ("Into the Scrape-Verse")

Scraperzz features an **Autonomous Self-Healing Scraper Engine** (`lib/self_healing.ts`) designed so the system automatically adapts and auto-repairs when target web DOM layouts or CSS class names change:

- **Tier 1 (Scraper Studio & Datasets)**: Bright Data API collectors & datasets (`gd_...`, `c_...`).
- **Tier 2 (SERP API Engine)**: Google SERP parsing (`brd_json=1`) when competitor structure or discovery fails.
- **Tier 3 (DOM Aria & Attribute Matching)**: Cheerio selector extraction for social channels & article wrappers (`<article>`, `[class*="post"]`).
- **Tier 4 (Regex & Heuristic Scanning)**: Markup scanning across raw HTML for embedded links and path prefixes (`/blog/`).
- **Tier 5 (AI Structural DOM Repair)**: If static rules yield 0 items due to DOM layout changes, raw HTML snippets are routed to **Groq AI Repair Engine** (`aiRepairExtraction`) to dynamically extract target data without human intervention.
- **Live Telemetry API & UI**: Auto-repair events are logged (`recordSelfHealingEvent`), exposed via `GET /api/self-healing`, and monitored live on the Competitors Dashboard.

---

## Stack

| Layer | Choice | Role |
|---|---|---|
| App | Next.js 16 + React 19 | UI and heavy-lifting APIs |
| Auth + DB | Supabase | Multi-tenant Postgres, Auth, RLS |
| Scraping (competitor discovery) | Bright Data **SERP API** | `POST /request` + `brd_json=1` on Google |
| Scraping (social content & datasets) | Bright Data Datasets & Scraper Studio | LinkedIn (`gd_...`), X (`gd_...`), Brand website & handles |
| Scraping (blog articles) | Bright Data + Cheerio | Blog listing link discovery & article extraction (`scrapeBrandBlog`) |
| LLM | Groq (`llama-3.3-70b-versatile` / `gpt-oss-120b`) | Brand extraction, gap analysis, blog articles & social posts |
| Visuals | Pollinations | Image generation for blog headers & social graphics |
| Scheduler | n8n | Weekly `POST /api/jobs/weekly` only |

---

## Product surfaces

| Route | Purpose | API |
|---|---|---|
| `/dashboard` | Platform metrics & quick actions | Supabase reads |
| `/dashboard/brands/new` | Create brand & scrape website | `POST /api/brands` |
| `/dashboard/product` | View & manage brand context profile | `GET /api/brands` |
| `/dashboard/competitors` | Discover, approve, find handles, scrape posts & blogs | `/discover-competitors`, `/find-handles`, `/scrape-content`, `/scrape-blog` |
| `/dashboard/intelligence` | Feed of scraped competitor posts & blog articles | `GET /api/intelligence` |
| `/dashboard/opportunities` | AI gap analysis report, competitor strategy insights, topic recommendations & direct post/blog generation | `POST /api/brands/:id/analyze-gaps` |
| `/dashboard/content` | Generate & view draft Blog Articles and Social Posts | `POST /api/brands/:id/generate-content` |
| `/dashboard/approvals` | Review, edit notes, approve, and queue publish | PATCH `/api/generated-content/:id` + `POST /api/publish` |

---

## APIs (heavy lifting)

| Method | Path | Who scrapes / thinks |
|---|---|---|
| POST | `/api/brands` | Scraper Studio `BRAND_WEBSITE` + Groq |
| POST | `/api/brands/:id/discover-competitors` | Bright Data SERP API |
| POST | `/api/competitors/:id/find-handles` | Bright Data Social Handles / HTML Parser |
| POST | `/api/competitors/:id/scrape-content` | Bright Data LinkedIn/X Datasets or Scraper Studio |
| POST | `/api/competitors/:id/scrape-blog` | Bright Data Brand Collector + Cheerio Blog Parser (`runScrapeBlog`) |
| POST | `/api/brands/:id/analyze-gaps` | Groq AI Gap Analysis Engine |
| POST | `/api/brands/:id/generate-content` | Groq (Blog articles & Social posts) + Pollinations |
| POST | `/api/publish` | Buffer or queued job |
| POST | `/api/jobs/weekly` | Secret; handles + posts + blog scrape + analyze + draft per ready brand |

---

## Data model

| Table | Role |
|---|---|
| `tenants` / `profiles` | Workspace & user management |
| `brands` | Brand context JSON & scrape status |
| `competitors` | Competitor directory (`discovered`, `approved`, `rejected`) |
| `competitor_social_handles` | Platform, handle & profile URL |
| `competitor_content` | Scraped social posts & blog articles |
| `gap_analysis_reports` | Findings JSON (`gaps`, `topics`, `formats`, `competitor_insights`) |
| `generated_content` | AI drafts (`content_type: 'article' | 'post'`, `platform: 'blog' | 'linkedin' | 'twitter' | 'instagram'`) |
| `publish_jobs` | Queue & status |

---

## Local run & workflow

1. Fill `.env.local`: Supabase credentials, `GROQ_API_KEY`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_SERP_ZONE`, and collector/dataset IDs.
2. `pnpm dev` — http://localhost:3000
3. Complete flow:
   - Add Brand → Scrape website context
   - Discover Competitors → Approve relevant rivals
   - Find Handles → Scrape posts & Scrape blog
   - Intelligence → Inspect collected feed
   - Opportunities → Run Gap Analysis → Click `+ Post` or `+ Blog` on recommended topics
   - Content Library → Generate custom Blog Articles or Social Posts
   - Approvals → Review, approve & publish
