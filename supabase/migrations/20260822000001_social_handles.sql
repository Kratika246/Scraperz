-- Module 3: Social Handle Scraping & Verification
-- Depends on 20260821140219_competitors.sql

create table if not exists competitor_social_handles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'facebook', 'other')),
  handle text not null,
  profile_url text not null,
  verified boolean not null default false,
  verification_confidence numeric, -- 0..1
  raw_data jsonb,
  status text not null default 'pending' check (status in ('pending', 'scraping', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(competitor_id, platform, handle)
);

create index if not exists idx_competitor_handles_tenant on competitor_social_handles(tenant_id);
create index if not exists idx_competitor_handles_comp on competitor_social_handles(competitor_id);

drop trigger if exists trg_handles_updated_at on competitor_social_handles;
create trigger trg_handles_updated_at
  before update on competitor_social_handles
  for each row execute function set_updated_at();

-- RLS
alter table competitor_social_handles enable row level security;

create policy "tenant members can read own handles"
  on competitor_social_handles for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own handles"
  on competitor_social_handles for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own handles"
  on competitor_social_handles for insert
  with check (tenant_id = current_tenant_id());
