import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/brands/callback
// Called BY n8n (server-to-server) once it finishes scraping + structuring
// a brand's website. Uses the service-role key so it bypasses RLS —
// authenticated instead via a shared secret header.
// body: { brand_id, status: 'ready' | 'failed', context?, scraped_raw_html? }
export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Webhook-Secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, status, context, scraped_raw_html } = await req.json();

  if (!brand_id || !status) {
    return NextResponse.json(
      { error: 'brand_id and status are required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('brands')
    .update({
      status,
      context: context ?? null,
      scraped_raw_html: scraped_raw_html ?? null,
    })
    .eq('id', brand_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}