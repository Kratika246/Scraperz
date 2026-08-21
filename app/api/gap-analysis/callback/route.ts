import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/gap-analysis/callback
// Service-role callback from n8n with gap analysis results
// body: { report_id, findings: { ... }, competitor_ids: [] }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { report_id, findings, competitor_ids } = await req.json();

  if (!report_id || !findings) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from('gap_analysis_reports')
    .update({
      status: 'done',
      findings,
      competitor_ids: competitor_ids || [],
      generated_at: new Date().toISOString()
    })
    .eq('id', report_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
