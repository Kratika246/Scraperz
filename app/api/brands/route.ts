import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runBrandScrape } from '@/lib/pipeline';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { name, website_url, raw_description } = body;

  if (!name || (!website_url && !raw_description)) {
    return NextResponse.json(
      { error: 'name and at least one of website_url / raw_description are required' },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

// Insert record with status 'pending' or 'scraping'
const { data: brand, error } = await supabase
  .from('brands')
  .insert({
    tenant_id: profile.tenant_id,
    name,
    website_url,
    raw_description,
    status: 'scraping',
  })
  .select()
  .single();

if (error) return NextResponse.json({ error: error.message }, { status: 500 });

// Process in background - DO NOT await here
runBrandScrape(supabase, brand).catch(async (err) => {
  console.error('Background scrape error:', err);
  await supabase.from('brands').update({ status: 'failed' }).eq('id', brand.id);
});

// Return immediately to frontend
return NextResponse.json({ brand, via: 'api' }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brands: data });
}
