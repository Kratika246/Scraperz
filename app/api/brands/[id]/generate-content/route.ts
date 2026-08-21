import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/brands/[id]/generate-content
// Triggers n8n to generate content (text and images) based on gap report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { gap_report_id, topic, platform } = await req.json();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  // Trigger n8n webhook
  try {
    const webhookUrl = process.env.N8N_CONTENT_GENERATION_WEBHOOK_URL || 'http://localhost/dummy';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        brand_id: brand.id,
        tenant_id: brand.tenant_id,
        context: brand.context,
        gap_report_id,
        topic,
        platform
      }),
    });
  } catch (err) {
    console.error('Failed to trigger content generation webhook:', err);
    return NextResponse.json({ error: 'Failed to trigger generation' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'generating' });
}
