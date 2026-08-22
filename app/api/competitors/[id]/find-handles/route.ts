import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFindHandles } from '@/lib/pipeline';

export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
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

  const { data: competitor, error } = await supabase
    .from('competitors')
    .select('id, tenant_id, brand_id, name, website_url')
    .eq('id', id)
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  if (!competitor.website_url) {
    return NextResponse.json({ error: 'No website URL to scrape' }, { status: 400 });
  }

  try {
    await runFindHandles(supabase, {
      id: competitor.id,
      tenant_id: competitor.tenant_id,
      website_url: competitor.website_url,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Handle discovery failed' },
      { status: 502 }
    );
  }

  const { data: handles } = await supabase
    .from('competitor_social_handles')
    .select('*')
    .eq('competitor_id', id);

  return NextResponse.json({
    ok: true,
    via: 'api',
    status: 'done',
    handles: handles || [],
  });
}
