-- Module 6: Content Generation
-- Depends on 20260822000003_gap_analysis.sql

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  gap_report_id uuid references gap_analysis_reports(id) on delete set null,
  content_type text not null, -- e.g., 'post', 'article'
  platform text,
  title text,
  draft_text text not null,
  generated_image_urls text[], -- Support for generated images
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'failed')),
  evidence_links jsonb, -- array of competitor post URLs that inspired this
  opportunity_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gen_content_tenant on generated_content(tenant_id);
create index if not exists idx_gen_content_brand on generated_content(brand_id);
create index if not exists idx_gen_content_status on generated_content(status);

drop trigger if exists trg_gen_updated_at on generated_content;
create trigger trg_gen_updated_at
  before update on generated_content
  for each row execute function set_updated_at();

-- RLS
alter table generated_content enable row level security;

create policy "tenant members can read own generated content"
  on generated_content for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own generated content"
  on generated_content for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own generated content"
  on generated_content for insert
  with check (tenant_id = current_tenant_id());

create policy "tenant members can delete own generated content"
  on generated_content for delete
  using (tenant_id = current_tenant_id());
