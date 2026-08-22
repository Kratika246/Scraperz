import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeSocialContent } from '@/lib/brightdata';

// POST /api/competitors/[id]/scrape-content
// Synchronously uses Bright Data (mocked for demo) to scrape posts from all verified handles
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

  // 1. Call Bright Data for each handle
  const allContent = [];
  for (const handle of handles) {
      const content = await scrapeSocialContent(handle.profile_url, handle.platform);
      
      for (const item of content) {
          allContent.push({
            competitor_id: competitor.id,
            tenant_id: competitor.tenant_id,
            handle_id: handle.id,
            platform: item.platform,
            content_type: item.content_type,
            text: item.text,
            media_urls: item.media_urls,
            posted_at: item.posted_at,
            engagement_metrics: item.engagement_metrics
          });
      }
  }

  // 2. Insert into DB
  if (allContent.length > 0) {
    const { error: insertError } = await supabase
      .from('competitor_content')
      .insert(allContent);

    if (insertError) {
      console.error('Failed to insert content:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, scraped_count: allContent.length });
}
