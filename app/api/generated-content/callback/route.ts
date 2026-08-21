import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/generated-content/callback
// Service-role callback from n8n with generated content
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, tenant_id, gap_report_id, content_type, platform, title, draft_text, generated_image_urls, evidence_links, opportunity_score } = await req.json();

  if (!brand_id || !tenant_id || !draft_text) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error: insertError } = await supabase
    .from('generated_content')
    .insert({
      brand_id,
      tenant_id,
      gap_report_id: gap_report_id || null,
      content_type: content_type || 'post',
      platform: platform || 'linkedin',
      title,
      draft_text,
      generated_image_urls: generated_image_urls || [],
      evidence_links: evidence_links || [],
      opportunity_score: opportunity_score || 0,
      status: 'draft'
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content: data });
}
