-- Module 2: Competitor discovery
-- Depends on 0001_init_schema.sql (tenants, brands, current_tenant_id())

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  website_url text,
  discovery_source text,        -- e.g. 'web_search', 'llm_suggestion', 'manual'
  confidence_score numeric,     -- 0..1, how confident the discovery step was
  status text not null default 'discovered'
    check (status in ('discovered', 'approved', 'rejected')),
  raw_data jsonb,               -- whatever the discovery step returned (snippets, rank, etc.)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, website_url)
);

create index if not exists idx_competitors_tenant on competitors(tenant_id);
create index if not exists idx_competitors_brand on competitors(brand_id);
create index if not exists idx_competitors_status on competitors(status);

drop trigger if exists trg_competitors_updated_at on competitors;
create trigger trg_competitors_updated_at
  before update on competitors
  for each row execute function set_updated_at();

-- track discovery run state on the brand itself, so the UI knows when
-- a "discover competitors" job is in flight
alter table brands
  add column if not exists competitor_discovery_status text
    default 'not_started'
    check (competitor_discovery_status in ('not_started', 'running', 'done', 'failed'));

-- ========== RLS ==========
alter table competitors enable row level security;

create policy "tenant members can read own competitors"
  on competitors for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own competitors"
  on competitors for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own competitors"
  on competitors for insert
  with check (tenant_id = current_tenant_id());

-- Service role (n8n callback) bypasses RLS as before.