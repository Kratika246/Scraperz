import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runScrapeContent } from '@/lib/pipeline';

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
    .select('id, tenant_id, name')
    .eq('id', id)
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  const { data: handles } = await supabase
    .from('competitor_social_handles')
    .select('id, platform, handle, profile_url')
    .eq('competitor_id', id)
    .eq('verified', true);

  if (!handles || handles.length === 0) {
    return NextResponse.json({ error: 'No verified handles found to scrape' }, { status: 400 });
  }

  try {
    const scraped_count = await runScrapeContent(
      supabase,
      competitor,
      handles as { id: string; platform: string; profile_url: string }[]
    );
    return NextResponse.json({ ok: true, via: 'api', scraped_count });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Content scrape failed' },
      { status: 502 }
    );
  }
}
