import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeSocialHandles } from '@/lib/brightdata';

// POST /api/competitors/[id]/find-handles
// Synchronously uses Bright Data (mocked for demo) to find handles
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

  if (!competitor.website_url) {
      return NextResponse.json({ error: 'No website URL to scrape' }, { status: 400 });
  }

  // 1. Call Bright Data
  const handles = await scrapeSocialHandles(competitor.website_url);

  // 2. Insert handles
  if (handles.length > 0) {
    const { error: insertError } = await supabase
      .from('competitor_social_handles')
      .upsert(
        handles.map((h) => ({
          competitor_id: competitor.id,
          tenant_id: competitor.tenant_id,
          platform: h.platform,
          handle: h.handle,
          profile_url: h.profile_url,
          verified: h.verified,
          verification_confidence: h.verification_confidence,
          status: 'ready'
        })),
        { onConflict: 'competitor_id, platform, handle' }
      );

    if (insertError) {
      console.error('Failed to insert handles:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data: newHandles } = await supabase
    .from('competitor_social_handles')
    .select('*')
    .eq('competitor_id', id);

  return NextResponse.json({ ok: true, handles: newHandles });
}
