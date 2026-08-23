# Setup & Deployment Guide

This guide walks through configuring Scraperzz (COMPETE) from scratch on local machines and production environments.

---

## 1. Prerequisites

- **Node.js**: v20.x or higher
- **Package Manager**: `pnpm` (version 10+)
- **Docker Desktop**: For running the local n8n automation container
- **Accounts**:
  - [Supabase](https://supabase.com) (Database + Auth)
  - [Groq Console](https://console.groq.com/keys) (Free fast LLM inference)
  - [Bright Data](https://brightdata.com) (SERP API + Scraper Studio)
  - *(Optional)* [NanoBanana](https://nanobanana.ai) (Production image generation)

---

## 2. Installation Steps

### Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/Kratika246/Scraperz.git
cd Scraperz

# Install with pnpm
pnpm install
```

### Step 2: Configure Environment Variables

Create `.env.local` based on `.env`:

```bash
cp .env .env.local
```

Ensure the following variables are configured:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Groq LLM
GROQ_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b

# Bright Data Scraping
BRIGHTDATA_API_KEY=<your-brightdata-token>
BRIGHTDATA_SERP_ZONE=serp_api1
BRIGHTDATA_COLLECTOR_BRAND_WEBSITE=c_...

# n8n Automation
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-secure-secret
```

### Step 3: Run Database Migrations

Apply the migration scripts in [`supabase/migrations/`](../supabase/migrations/) sequentially in your Supabase SQL editor, or run:

```bash
npx supabase db push
```

### Step 4: Start the Local Development Server

```bash
pnpm dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to access the landing, login, and dashboard pages.

---

## 3. n8n Scheduler Setup (Docker)

To run the automated weekly scraper pipeline:

```bash
# Start container in detached mode
docker compose up -d

# Check status
docker compose ps
```

1. Open [http://localhost:5678](http://localhost:5678).
2. Complete the initial setup wizard.
3. Import workflow: **Workflows** → **Import from File** → Select [`n8n_workflows/weekly_refresh.json`](../n8n_workflows/weekly_refresh.json).
4. Activate the workflow to trigger the weekly refresh every Monday at 09:00 IST.

---

## 4. Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Add all production environment variables to your hosting provider (Vercel / AWS / Render).
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept private and never exposed to the client.
- [ ] Verify outbound webhook firewall rules allow n8n to call `https://your-domain.com/api/jobs/weekly`.
