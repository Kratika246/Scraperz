import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/brands/[id]/analyze-gaps
// Triggers n8n to perform gap analysis based on brand context and competitor content
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

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  // Create a pending report
  const { data: report, error: insertError } = await supabase
    .from('gap_analysis_reports')
    .insert({
      tenant_id: brand.tenant_id,
      brand_id: brand.id,
      status: 'running'
    })
    .select()
    .single();

  if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Trigger n8n webhook
  try {
    const webhookUrl = process.env.N8N_GAP_ANALYSIS_WEBHOOK_URL || 'http://localhost/dummy';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        report_id: report.id,
        brand_id: brand.id,
        tenant_id: brand.tenant_id,
        context: brand.context
      }),
    });
  } catch (err) {
    console.error('Failed to trigger gap analysis webhook:', err);
  }

  return NextResponse.json({ ok: true, report });
}
