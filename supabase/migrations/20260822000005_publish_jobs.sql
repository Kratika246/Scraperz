-- Module 8: Publishing via Buffer
-- Depends on 20260822000004_generated_content.sql

create table if not exists publish_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  content_id uuid not null references generated_content(id) on delete cascade,
  buffer_profile_id text not null, -- Buffer's profile ID
  scheduled_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'published', 'failed')),
  buffer_post_id text, -- ID returned by Buffer API
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_publish_jobs_tenant on publish_jobs(tenant_id);
create index if not exists idx_publish_jobs_content on publish_jobs(content_id);
create index if not exists idx_publish_jobs_status on publish_jobs(status);

drop trigger if exists trg_publish_jobs_updated_at on publish_jobs;
create trigger trg_publish_jobs_updated_at
  before update on publish_jobs
  for each row execute function set_updated_at();

-- RLS
alter table publish_jobs enable row level security;

create policy "tenant members can read own publish jobs"
  on publish_jobs for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update own publish jobs"
  on publish_jobs for update
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own publish jobs"
  on publish_jobs for insert
  with check (tenant_id = current_tenant_id());
