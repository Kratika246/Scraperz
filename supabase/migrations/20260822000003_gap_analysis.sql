-- Module 5: Gap Analysis
-- Depends on 20260822000002_competitor_content.sql

create table if not exists gap_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  generated_at timestamptz,
  findings jsonb, -- { topics: [], formats: [], cadence: {}, engagement: [], gaps: [] }
  competitor_ids uuid[], -- competitors included in this analysis
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gap_analysis_tenant on gap_analysis_reports(tenant_id);
create index if not exists idx_gap_analysis_brand on gap_analysis_reports(brand_id);

drop trigger if exists trg_gap_updated_at on gap_analysis_reports;
create trigger trg_gap_updated_at
  before update on gap_analysis_reports
  for each row execute function set_updated_at();

-- RLS
alter table gap_analysis_reports enable row level security;

create policy "tenant members can read own gap reports"
  on gap_analysis_reports for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own gap reports"
  on gap_analysis_reports for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own gap reports"
  on gap_analysis_reports for insert
  with check (tenant_id = current_tenant_id());
