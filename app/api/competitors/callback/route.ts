import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/competitors/callback
// Service-role callback from n8n with discovered competitors
// body: { brand_id, tenant_id, competitors: [{ name, website_url, discovery_source, confidence_score, raw_data }] }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, tenant_id, competitors } = await req.json();

  if (!brand_id || !tenant_id || !Array.isArray(competitors)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Insert competitors
  if (competitors.length > 0) {
    const { error: insertError } = await supabase
      .from('competitors')
      .insert(
        competitors.map((c: any) => ({
          brand_id,
          tenant_id,
          name: c.name,
          website_url: c.website_url,
          discovery_source: c.discovery_source || 'n8n',
          confidence_score: c.confidence_score || 1.0,
          raw_data: c.raw_data || null,
          status: 'discovered'
        }))
      );

    if (insertError) {
      console.error('Failed to insert competitors:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Update brand status
  const { error: updateError } = await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'done' })
    .eq('id', brand_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: competitors.length });
}
