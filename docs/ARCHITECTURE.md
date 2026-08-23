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
│  │                       │  │                       │  │  · /api/buffer  │  │
│  │                       │  │                       │  │  · /image-gen   │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
└──────────────┬──────────────────────────┬─────────────────────────┬─────────┘
               │                          │                         │
┌──────────────▼────────────┐ ┌───────────▼───────────┐ ┌───────────▼─────────┐
│     Database & Auth       │ │ Scraping & Discovery  │ │   LLM Intelligence  │
│                           │ │                       │ │                     │
│  Supabase (PostgreSQL)    │ │ Bright Data Engine    │ │ Groq Inference API  │
│  · Row Level Security     │ │ · SERP API (Google)   │ │ · gpt-oss-120b      │
│  · Multi-tenant profiles  │ │ · Scraper Studio      │ │ · llama-3.3-70b     │
│  · Content & publish queue│ │ · Web Datasets        │ │ · Structured JSON   │
│  · Buffer Access Tokens   │ │ · Cheerio DOM Parser  │ │ · Gap Analysis      │
└───────────────────────────┘ └───────────────────────┘ └───────────┬─────────┘
                                                                    │ Visual Prompt
                                                        ┌───────────▼─────────┐
                                                        │ Image Gen Cascade   │
                                                        │                     │
                                                        │ 1. Pollinations AI  │
                                                        │ 2. AI Horde Grid    │
                                                        │ 3. FLUX / NanoBanana│
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

1. **API-First Heavy Lifting**: The React UI remains lightweight and declarative. All heavy computations—multi-source web scraping, LLM prompt chaining, gap matrix calculations, image synthesis, and Buffer publishing—are executed exclusively inside isolated Next.js server route handlers.
2. **Autonomous Self-Healing**: Scraping logic employs a 5-tier graceful degradation pipeline (`lib/self_healing.ts`), automatically recovering from DOM layout changes without human intervention.
3. **Resilient Multi-Tier Image Generation**: Visual creation (`lib/image-gen.ts`) uses a free-first cascade (Pollinations → AI Horde → FLUX.1 / NanoBanana), ensuring images are always produced even during external service outages.
4. **Buffer Multi-Channel Publishing**: Direct integration with the Buffer GraphQL & REST API (`lib/buffer.ts`) allows scheduling and dispatching content directly to LinkedIn, Twitter, Facebook, and Instagram.
5. **Decoupled Workflow Scheduling**: n8n is strictly utilized as a cron scheduler invoking webhook endpoints (`/api/jobs/weekly`). It does not store credentials or perform direct scraping, preserving a clean boundary.
6. **Strict Multi-Tenancy & RLS**: All database rows belong to a `tenant_id` associated with authenticated user profiles in Supabase.

---

## 3. End-to-End Component Lifecycle

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
[Next.js API: /api/brands/:id/generate-content] ──► Groq drafts articles/posts + Image Gen Cascade
       │
       ▼
[Approval Dashboard] ──► Human review → [Buffer API / POST /api/publish] → Social Channels
```

---

## 4. Subsystem Details

### Next.js App Router (v16.3 + React 19)
- Server components for fast initial load and layout encapsulation.
- Client components for interactive tables, real-time status toggles, and live telemetry feeds.
- Route handlers with `AbortSignal.timeout` safeguards and standardized JSON error responses.

### Buffer Publishing Engine (`lib/buffer.ts`)
- Implements GraphQL mutations (`createPost`) for modern Buffer OAuth channels.
- Automatic URL resolution for tracking published live updates across Twitter, LinkedIn, etc.
- In-memory and per-tenant Supabase persistence for Buffer access tokens.

### Image Generation Cascade (`lib/image-gen.ts`)
- Tier 1: Pollinations AI (fast zero-config default).
- Tier 2: AI Horde (distributed open-source fallback).
- Tier 3: Hugging Face / Together FLUX.1 & NanoBanana (premium high-fidelity models).

### Groq LLM Inference Layer
- OpenAI-compatible `/v1` client with strict JSON schema response mode (`chatJson`).
- Low-latency models (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`).

---

*Refer to [Docs Index](../README.md#documentation-index) for topic-specific guides.*
