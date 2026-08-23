-- Module 9: Buffer Integration & Published URLs
alter table tenants add column if not exists buffer_access_token text;
alter table tenants add column if not exists buffer_settings jsonb;

alter table generated_content add column if not exists published_url text;
alter table generated_content add column if not exists published_at timestamptz;

alter table publish_jobs add column if not exists published_url text;
