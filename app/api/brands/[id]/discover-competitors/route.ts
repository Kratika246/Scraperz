import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/brands/[id]/discover-competitors
// Triggers n8n to find competitors for this brand
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

  // Verify ownership and get brand context
  const { data: brand, error } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (error || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  if (!brand.context) {
    return NextResponse.json(
      { error: 'Brand context not yet built. Please wait for scraping to finish.' },
      { status: 400 }
    );
  }

  // Update status to running
  const { error: updateError } = await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'running' })
    .eq('id', brand.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Trigger n8n webhook
  try {
    const webhookUrl = process.env.N8N_COMPETITOR_DISCOVERY_WEBHOOK_URL || 'http://localhost/dummy';
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
      }),
    });
  } catch (err) {
    console.error('Failed to trigger competitor discovery webhook:', err);
    // Don't fail the request, just let it stay running. n8n might be down.
  }

  return NextResponse.json({ ok: true, status: 'running' });
}
