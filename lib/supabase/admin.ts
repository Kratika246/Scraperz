import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// SERVICE ROLE client — bypasses RLS. Only ever import this in server-only
// code (API routes / server actions), never in client components, and
// never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}