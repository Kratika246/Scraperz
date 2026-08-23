# Database Schema & Entity Relationships

The COMPETE persistence layer is built on **PostgreSQL (Supabase)** with Row-Level Security (RLS) enforcing tenant isolation.

---

## 1. Entity Relationship Diagram (ERD)

```
   ┌───────────────┐
   │    tenants    │ (holds buffer_access_token)
   └───┬───────────┘
       │ 1
       │
       │ N
   ┌───▼───────────┐         ┌───────────────────────────┐
   │    brands     ├─────────►   gap_analysis_reports    │
   └───┬───────────┘ 1     N └───────────────────────────┘
       │ 1
       │
       ├─────────────────────┐
       │ N                   │ N
   ┌───▼───────────┐     ┌───▼───────────────────────────┐
   │  competitors  │     │       generated_content       │
   └───┬───────────┘     └───┬───────────────────────────┘
       │ 1                   │ 1
       │                     │
       ├──────────────┐      │ N
       │ N            │ N ┌──▼───────────────────────────┐
   ┌───▼────────┐ ┌───▼───┴──────────┐   │         publish_jobs          │
   │ competitor_│ │competitor_content│   │ (Buffer post & update status) │
   │   social_  │ └──────────────────┘   └───────────────────────────────┘
   │   handles  │
   └────────────┘
```

---

## 2. Table Definitions

### `tenants` & `profiles`
Multi-tenant root isolating organizations, workspaces, and team memberships. Includes Buffer access token per tenant.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  buffer_access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `brands`
Stores company profiles and AI-extracted brand context.

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  raw_description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scraping', 'ready', 'error')),
  context JSONB,
  scraped_raw_html TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `competitors` & `competitor_social_handles`
Discovered rivals and their associated social presence across platforms.

```sql
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'approved', 'rejected')),
  discovery_score INTEGER DEFAULT 0,
  source TEXT DEFAULT 'brightdata_serp',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE competitor_social_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'youtube', 'tiktok', 'other')),
  handle TEXT NOT NULL,
  profile_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now()
);
```

### `competitor_content`
Scraped social posts and blog articles used for competitive benchmarking.

```sql
CREATE TABLE competitor_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'article')),
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  url TEXT,
  title TEXT,
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT now()
);
```

### `gap_analysis_reports`
Matrix of competitive gaps, recommended topics, and positioning vectors.

```sql
CREATE TABLE gap_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  findings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `generated_content` & `publish_jobs`
Draft articles and social media posts prepared for human approval and automated publishing.

```sql
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'post' CHECK (content_type IN ('article', 'post')),
  platform TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  generated_image_urls TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed')),
  target_profiles TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  buffer_update_id TEXT,
  published_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
