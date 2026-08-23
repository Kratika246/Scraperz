-- Allow workspace members to persist Buffer token + channel defaults on their tenant.
create policy "tenant members can update own tenant"
  on tenants for update
  using (id = current_tenant_id())
  with check (id = current_tenant_id());
