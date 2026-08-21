import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/competitors/[id]/scrape-content
// Triggers n8n to scrape recent posts from all verified handles for a competitor
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

  // Get competitor
  const { data: competitor, error } = await supabase
    .from('competitors')
    .select('id, tenant_id, name')
    .eq('id', id)
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  // Get verified handles
  const { data: handles } = await supabase
    .from('competitor_social_handles')
    .select('id, platform, handle, profile_url')
    .eq('competitor_id', id)
    .eq('verified', true);
    
  if (!handles || handles.length === 0) {
      return NextResponse.json({ error: 'No verified handles found to scrape' }, { status: 400 });
  }

  // Trigger n8n webhook
  try {
    const webhookUrl = process.env.N8N_CONTENT_SCRAPE_WEBHOOK_URL || 'http://localhost/dummy';
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
        handles
      }),
    });
  } catch (err) {
    console.error('Failed to trigger content scrape webhook:', err);
  }

  return NextResponse.json({ ok: true, status: 'running' });
}
