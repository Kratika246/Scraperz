import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/competitors/[id]/find-handles
// Triggers n8n to find social handles for this competitor
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get competitor details
  const { data: competitor, error } = await supabase
    .from('competitors')
    .select('id, tenant_id, brand_id, name, website_url')
    .eq('id', id)
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  // Get brand context to help with verification
  const { data: brand } = await supabase
    .from('brands')
    .select('context')
    .eq('id', competitor.brand_id)
    .single();

  // Trigger n8n webhook
  try {
    const webhookUrl = process.env.N8N_SOCIAL_HANDLES_WEBHOOK_URL || 'http://localhost/dummy';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        competitor_id: competitor.id,
        tenant_id: competitor.tenant_id,
        name: competitor.name,
        website_url: competitor.website_url,
        brand_context: brand?.context,
      }),
    });
  } catch (err) {
    console.error('Failed to trigger social handles webhook:', err);
  }

  return NextResponse.json({ ok: true, status: 'running' });
}
