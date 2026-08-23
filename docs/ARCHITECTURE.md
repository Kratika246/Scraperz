# System Architecture & Technical Design

COMPETE (Scraperzz) is designed as a high-performance, multi-tenant competitive intelligence and automated content engine.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Client / Web Browser                             │
│                    (Next.js 16 App Router · React 19 UI)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST (Fetch API)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           Next.js API Gateway                              │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │   Brand Operations    │  │ Competitor Operations │  │ Content & Jobs  │  │
│  │  /api/brands/*        │  │  /api/competitors/*   │  │  /api/content   │  │
│  │  · Discovery          │  │  · Find Handles       │  │  · Approvals    │  │
│  │  · Gap Analysis       │  │  · Scrape Posts       │  │  · Publish Jobs │  │
│  │  · Content Generation │  │  · Scrape Blog        │  │  · Self-Healing │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
└──────────────┬──────────────────────────┬─────────────────────────┬─────────┘
               │                          │                         │
┌──────────────▼────────────┐ ┌───────────▼───────────┐ ┌───────────▼─────────┐
│     Database & Auth       │ │ Scraping & Discovery  │ │   LLM Intelligence  │
│                           │ │                       │ │                     │
│  Supabase (PostgreSQL)    │ │ Bright Data Engine    │ │ Groq Inference API  │
│  · Row Level Security     │ │ · SERP API (Google)   │ │ · gpt-oss-120b      │
│  · Multi-tenant profiles  │ │ · Scraper Studio      │ │ · llama-3.3-70b     │
│  · Content storage        │ │ · Web Datasets        │ │ · Structured JSON   │
│  · Job status queues      │ │ · Cheerio DOM Parser  │ │ · Gap Analysis      │
└───────────────────────────┘ └───────────────────────┘ └───────────┬─────────┘
                                                                    │ Visual Prompt
                                                        ┌───────────▼─────────┐
                                                        │   Image Generation  │
                                                        │                     │
                                                        │ · Pollinations AI   │
                                                        │   (Free tier)       │
                                                        │ · NanoBanana API    │
                                                        │   (Production tier) │
                                                        └─────────────────────┘
                               ▲
┌──────────────────────────────┴──────────────────────────────┐
│                   Background Orchestration                  │
│                                                             │
│  n8n Scheduler (Docker)                                     │
│  · Cron trigger: Every Monday 09:00 IST                     │
│  · Calls: POST /api/jobs/weekly                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

1. **API-First Heavy Lifting**: The React UI remains lightweight and declarative. All heavy computations—multi-source web scraping, LLM prompt chaining, gap matrix calculations, and image synthesis—are executed exclusively inside isolated Next.js server route handlers.
2. **Autonomous Self-Healing**: Scraping logic employs a 5-tier graceful degradation pipeline (`lib/self_healing.ts`), automatically recovering from DOM layout changes without human intervention.
3. **Decoupled Workflow Scheduling**: n8n is strictly utilized as a cron scheduler invoking webhook endpoints (`/api/jobs/weekly`). It does not store credentials or perform direct scraping, preserving a clean boundary.
4. **Strict Multi-Tenancy & RLS**: All database rows belong to a `tenant_id` associated with authenticated user profiles in Supabase.

---

## 3. Component Interaction Lifecycle

```
[1. User adds Brand URL]
       │
       ▼
[Next.js API: /api/brands] ──► [Bright Data: Scrape Brand Website]
       │
       ▼
[Groq LLM Engine] ──► Extracts Context (Industry, Audience, Value Props, Tone)
       │
       ▼
[Supabase DB] ──► Stores brand context in `brands` table
       │
       ▼
[Next.js API: /api/brands/:id/discover-competitors] ──► [Bright Data SERP API]
       │
       ▼
[Deduplication & Scoring Engine] ──► Persists rivals in `competitors`
       │
       ▼
[Next.js API: /api/competitors/:id/scrape-*] ──► Scrapes Social + Blogs
       │
       ▼
[Next.js API: /api/brands/:id/analyze-gaps] ──► Groq analyzes brand vs. competitor feeds
       │
       ▼
[Next.js API: /api/brands/:id/generate-content] ──► Groq drafts articles/posts + Image Gen Engine
       │
       ▼
[Approval Dashboard] ──► Human review & Buffer/Queue publishing
```

---

## 4. Subsystem Details

### Next.js App Router (v16.3 + React 19)
- Server components for fast initial load and layout encapsulation.
- Client components for interactive tables, real-time status toggles, and live telemetry feeds.
- Route handlers with `AbortSignal.timeout` safeguards and standardized JSON error responses.

### Supabase Layer
- JWT authentication with secure HTTP-only cookies.
- Real-time updates for long-running scrape job status changes.
- PostgreSQL schema configured with cascades and safety constraints.

### Bright Data Integration Layer
- **SERP API Zone**: Dynamic query generator targeting competitor discovery queries.
- **Scraper Studio**: Collector endpoints for structured social profile details and handle discovery.
- **Cheerio Fallback**: Lightweight DOM selector parsing for blog feeds and article bodies.

### Groq LLM Inference Layer
- OpenAI-compatible `/v1` client with strict JSON schema response mode (`chatJson`).
- Low-latency models (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`).

---

*Refer to [Docs Index](../README.md#documentation-index) for topic-specific guides.*
