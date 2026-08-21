-- Module 4: Content Scraping
-- Depends on 20260822000001_social_handles.sql

create table if not exists competitor_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  competitor_id uuid not null references competitors(id) on delete cascade,
  handle_id uuid references competitor_social_handles(id) on delete set null,
  platform text not null,
  content_type text not null, -- e.g., 'post', 'article', 'video'
  title text,
  text text,
  media_urls text[],
  posted_at timestamptz,
  engagement_metrics jsonb, -- { likes, shares, comments, views }
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comp_content_tenant on competitor_content(tenant_id);
create index if not exists idx_comp_content_comp on competitor_content(competitor_id);
create index if not exists idx_comp_content_platform on competitor_content(platform);
create index if not exists idx_comp_content_posted on competitor_content(posted_at desc);

drop trigger if exists trg_content_updated_at on competitor_content;
create trigger trg_content_updated_at
  before update on competitor_content
  for each row execute function set_updated_at();

-- RLS
alter table competitor_content enable row level security;

create policy "tenant members can read own content"
  on competitor_content for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own content"
  on competitor_content for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own content"
  on competitor_content for insert
  with check (tenant_id = current_tenant_id());
