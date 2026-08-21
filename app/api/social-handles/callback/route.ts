import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/social-handles/callback
// Service-role callback from n8n with discovered handles
// body: { competitor_id, tenant_id, handles: [{ platform, handle, profile_url, verified, verification_confidence, raw_data }] }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { competitor_id, tenant_id, handles } = await req.json();

  if (!competitor_id || !tenant_id || !Array.isArray(handles)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (handles.length > 0) {
    const { error: insertError } = await supabase
      .from('competitor_social_handles')
      .upsert(
        handles.map((h: any) => ({
          competitor_id,
          tenant_id,
          platform: h.platform,
          handle: h.handle,
          profile_url: h.profile_url,
          verified: h.verified || false,
          verification_confidence: h.verification_confidence || 0,
          raw_data: h.raw_data || null,
          status: 'ready'
        })),
        { onConflict: 'competitor_id, platform, handle' }
      );

    if (insertError) {
      console.error('Failed to insert handles:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, inserted: handles.length });
}
