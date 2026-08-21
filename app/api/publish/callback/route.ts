import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/publish/callback
// Service-role callback for Buffer webhooks (e.g. post actually published)
export async function POST(req: NextRequest) {
  // Buffer webhooks generally use signature verification, but for this hackathon
  // we'll just accept a generic webhook secret if we use a proxy, or skip for now.
  const { buffer_post_id, status } = await req.json();

  if (!buffer_post_id || !status) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('publish_jobs')
    .update({
      status: status === 'sent' ? 'published' : status, // map Buffer status if needed
    })
    .eq('buffer_post_id', buffer_post_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
