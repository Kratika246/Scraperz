import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runScrapeBlog } from '@/lib/pipeline';

export const maxDuration = 120;

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
    .select('id, tenant_id, name, website_url')
    .eq('id', id)
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  let blogUrl = '';
  try {
    const body = await req.json();
    if (body?.blog_url && typeof body.blog_url === 'string') {
      blogUrl = body.blog_url.trim();
    }
  } catch {
    /* No JSON body provided */
  }

  if (!blogUrl) {
    if (!competitor.website_url) {
      return NextResponse.json({ error: 'No website URL to scrape blog from' }, { status: 400 });
    }
    blogUrl = competitor.website_url.replace(/\/+$/, '') + '/blog';
  }

  try {
    const scraped_count = await runScrapeBlog(
      supabase,
      competitor,
      blogUrl
    );
    return NextResponse.json({ ok: true, via: 'api', scraped_count, blog_url: blogUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Blog scrape failed' },
      { status: 502 }
    );
  }
}
