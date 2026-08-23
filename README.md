# COMPETE (Scraperzz)

> **Autonomous AI-powered competitive intelligence & content generation platform.**  
> Monitor rival brands, discover strategic content gaps, and generate & publish on-brand blog articles and social posts automatically via Buffer.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E?logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Inference-f55036)](https://console.groq.com)
[![Bright Data](https://img.shields.io/badge/Scraping-Bright%20Data-blue)](https://brightdata.com)
[![Buffer](https://img.shields.io/badge/Publishing-Buffer%20GraphQL-231F20)](https://buffer.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com)

---

## 📖 Documentation Index

The project documentation is split into modular topics. Explore the dedicated guides below:

| Guide | Description |
|---|---|
| 🏗️ [**Architecture & System Design**](docs/ARCHITECTURE.md) | High-level topology, component lifecycles, data flow diagrams, Buffer publishing engine, and architectural principles. |
| 🛡️ [**Self-Healing Scraper Engine**](docs/SELF_HEALING_SCRAPING.md) | The 5-tier resilience hierarchy ("Into the Scrape-Verse"), AI DOM structural repair, and telemetry. |
| 🎨 [**Image Generation (Pollinations & Premium Models)**](docs/IMAGE_GENERATION.md) | Multi-tier cascade (Pollinations, AI Horde, FLUX.1, NanoBanana), standalone image API (`/api/image-gen`), and prompt strategy. |
| 🔌 [**REST API Reference**](docs/API_REFERENCE.md) | Comprehensive endpoints guide for Brands, Competitors, Intelligence, Approvals, Buffer Settings, and Jobs. |
| 🗄️ [**Database Schema & ERD**](docs/DATABASE_SCHEMA.md) | Multi-tenant PostgreSQL table definitions, Buffer token columns, constraints, relationships, and RLS policies. |
| 🚀 [**Setup & Deployment Guide**](docs/SETUP_GUIDE.md) | Step-by-step local setup, Buffer token integration, environment variables, Supabase migrations, and Docker n8n configuration. |

---

## ⚡ Quick Overview

COMPETE automates the competitive intelligence loop for modern marketing and growth teams:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Discover │ ──► │  2. Scrape   │ ──► │  3. Analyze  │ ──► │ 4. Generate  │
│  Competitors │     │ Posts & Blog │     │ Content Gaps │     │ Posts & Blog │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────────┐
                                                               │  5. Approve  │
                                                               │  & Publish   │
                                                               │  (via Buffer)│
                                                               └──────────────┘
```

1. **Brand Profile**: Enter a brand URL → Bright Data extracts the site → Groq LLM infers target audience, value propositions, and tone of voice.
2. **Competitor Discovery**: Bright Data SERP API queries Google for organic alternatives and ranks competitors.
3. **Multi-Source Scraping**: Scrapes competitor LinkedIn posts, X posts, and blog articles.
4. **Autonomous Self-Healing**: Resilient 5-tier scraper engine (`lib/self_healing.ts`) with dynamic AI DOM recovery if target page structures change.
5. **Gap Analysis**: Groq compares your brand against competitor feeds to uncover unmet topics and formats.
6. **Multi-Format Content Generation**: Generates SEO-ready Markdown Blog Articles and Social Posts paired with AI-generated graphics ([Pollinations / AI Horde / Premium Models](docs/IMAGE_GENERATION.md)).
7. **Human-in-the-Loop Review & Publishing**: Review and edit drafts in the Approval Center, then queue and publish directly to connected social channels via the **Buffer GraphQL API**.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Scraping Engine**: Bright Data (SERP API + Scraper Studio collectors + Datasets) + Cheerio
- **LLM Intelligence**: Groq (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`)
- **Image Generation**: [Pollinations AI / AI Horde / FLUX.1 / NanoBanana](docs/IMAGE_GENERATION.md)
- **Publishing Pipeline**: Buffer GraphQL API (`lib/buffer.ts`)
- **Workflow Automation**: n8n (Docker container for scheduled weekly cron triggers)
- **Styling**: Tailwind CSS v4

---

## 🚀 Quick Start

```bash
# 1. Clone repo
git clone https://github.com/Kratika246/Scraperz.git
cd Scraperz

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env .env.local

# 4. Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the application.

For detailed setup, migrations, Buffer configuration, and Docker instructions, see the [Setup & Deployment Guide](docs/SETUP_GUIDE.md).

---

## 📂 Project Structure

```
scraperz/
├── app/
│   ├── (auth)/               # Login & signup pages (split-panel layout)
│   ├── api/                  # Backend REST API routes
│   │   ├── brands/           # Brand CRUD, discovery, gap analysis, content gen
│   │   ├── buffer/           # Buffer channel & settings API
│   │   ├── competitors/      # Handle discovery, content/blog scraping
│   │   ├── generated-content/# Draft updates & approvals
│   │   ├── image-gen/        # On-demand image generation endpoint
│   │   ├── intelligence/     # Scraped feed queries
│   │   ├── jobs/             # Weekly cron trigger endpoint
│   │   ├── publish/          # Queue & direct Buffer publishing
│   │   └── self-healing/     # Telemetry logs API
│   ├── dashboard/            # Dashboard views (Competitors, Intelligence, Opportunities, Content, Approvals, Settings)
│   └── page.tsx              # Modern landing page
├── docs/                     # 📚 Modular documentation guides
│   ├── ARCHITECTURE.md
│   ├── IMAGE_GENERATION.md
│   ├── SELF_HEALING_SCRAPING.md
│   ├── API_REFERENCE.md
│   ├── DATABASE_SCHEMA.md
│   └── SETUP_GUIDE.md
├── lib/
│   ├── brightdata.ts         # Bright Data scraping implementation
│   ├── buffer.ts             # Buffer GraphQL API publishing engine
│   ├── image-gen.ts          # Free-first multi-tier image generation cascade
│   ├── llm.ts                # Groq client & chat helpers
│   ├── pipeline.ts           # Orchestration pipeline
│   └── self_healing.ts       # 5-tier self-healing scraper engine
├── supabase/migrations/      # SQL schema migrations (including Buffer tokens)
└── n8n_workflows/            # Weekly scheduler workflow
```

---

## 📄 License

Licensed under the MIT License.
