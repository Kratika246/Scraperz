import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth/signup
// body: { email: string, password: string, company_name?: string }
// company_name flows into handle_new_user() -> becomes the tenant's name.
export async function POST(req: NextRequest) {
  const { email, password, company_name } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password are required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: company_name ? { company_name } : undefined,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If email confirmation is ON in Supabase Auth settings, data.session will
  // be null here until the user clicks the confirm link — that's expected.
  return NextResponse.json({
    user: data.user,
    session: data.session,
    message: data.session
      ? 'Signed up and logged in.'
      : 'Signed up — check email to confirm before logging in.',
  });
}