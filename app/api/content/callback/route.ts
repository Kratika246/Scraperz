import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/content/callback
// Service-role callback from n8n with scraped content
// body: { competitor_id, tenant_id, content: [{ handle_id, platform, content_type, title, text, media_urls, posted_at, engagement_metrics }] }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { competitor_id, tenant_id, content } = await req.json();

  if (!competitor_id || !tenant_id || !Array.isArray(content)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (content.length > 0) {
    const { error: insertError } = await supabase
      .from('competitor_content')
      .insert(
        content.map((c: any) => ({
          competitor_id,
          tenant_id,
          handle_id: c.handle_id || null,
          platform: c.platform,
          content_type: c.content_type || 'post',
          title: c.title || null,
          text: c.text,
          media_urls: c.media_urls || [],
          posted_at: c.posted_at || new Date().toISOString(),
          engagement_metrics: c.engagement_metrics || {}
        }))
      );

    if (insertError) {
      console.error('Failed to insert content:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, inserted: content.length });
}
