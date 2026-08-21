-- Module 1: Multi-tenant foundation schema
-- Run via: supabase migration up  (or supabase db push)

-- ========== TENANTS ==========
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ========== PROFILES (1 auth user -> 1 tenant, keep simple for hackathon) ==========
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_tenant on profiles(tenant_id);

-- ========== BRANDS ==========
-- One tenant can eventually have multiple brand profiles (rare, but keep flexible)
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  website_url text,
  raw_description text,          -- what the user typed in, if anything
  status text not null default 'pending'
    check (status in ('pending', 'scraping', 'ready', 'failed')),
  scraped_raw_html text,         -- optional raw dump for debugging/audit
  context jsonb,                 -- structured brand context (see below)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brands_tenant on brands(tenant_id);

-- context jsonb shape (populated by n8n after scrape), roughly:
-- {
--   "tagline": "...",
--   "value_props": ["...", "..."],
--   "products": ["...", "..."],
--   "target_audience": "...",
--   "tone_keywords": ["...", "..."],
--   "industry": "...",
--   "raw_summary": "..."
-- }

-- ========== updated_at trigger ==========
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_brands_updated_at on brands;
create trigger trg_brands_updated_at
  before update on brands
  for each row execute function set_updated_at();

-- ========== auto-create tenant + profile on signup ==========
create or replace function handle_new_user()
returns trigger as $$
declare
  new_tenant_id uuid;
begin
  insert into tenants (name) values (coalesce(new.raw_user_meta_data->>'company_name', new.email))
    returning id into new_tenant_id;

  insert into profiles (id, tenant_id, email)
  values (new.id, new_tenant_id, new.email);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== RLS ==========
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table brands enable row level security;

-- helper: current user's tenant_id
create or replace function current_tenant_id()
returns uuid as $$
  select tenant_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "tenant members can read own tenant"
  on tenants for select
  using (id = current_tenant_id());

create policy "users can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "tenant members can read own brands"
  on brands for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can insert own brands"
  on brands for insert
  with check (tenant_id = current_tenant_id());

create policy "tenant members can update own brands"
  on brands for update
  using (tenant_id = current_tenant_id());

-- Service role (used by n8n via service key) bypasses RLS automatically,
-- so the workflow can write scrape results back without a policy for it.