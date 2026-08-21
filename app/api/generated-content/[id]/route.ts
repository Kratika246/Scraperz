import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/generated-content/[id]
// Update generated content status (approve, reject) and draft text
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, draft_text, review_notes } = await req.json();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const updates: any = {};
  if (status) updates.status = status;
  if (draft_text) updates.draft_text = draft_text;
  
  // Note: review_notes is handled only in the UI/session or can be added to the DB if needed.

  const { data: content, error } = await supabase
    .from('generated_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content });
}
