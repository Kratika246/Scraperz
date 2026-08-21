import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/auth/me
// Returns the current logged-in user (and their tenant), or null.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, email')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ user, profile });
}