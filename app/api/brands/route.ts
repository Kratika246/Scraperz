import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/brands
// body: { name: string, website_url?: string, raw_description?: string }
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

  // profiles.tenant_id is resolved server-side via RLS/current_tenant_id(),
  // we just need tenant_id explicitly for the insert since RLS checks it on write.
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      tenant_id: profile.tenant_id,
      name,
      website_url,
      raw_description,
      status: website_url ? 'scraping' : 'ready',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget trigger to n8n if there's a website to scrape.
  if (website_url) {
    try {
      await fetch(process.env.N8N_BRAND_SCRAPE_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          brand_id: brand.id,
          tenant_id: profile.tenant_id,
          website_url,
        }),
      });
    } catch (err) {
      // Don't fail the request over this — brand stays in "scraping" status,
      // n8n can be retried, or you can build a manual "retry scrape" button.
      console.error('Failed to trigger n8n scrape workflow:', err);
    }
  }

  return NextResponse.json({ brand }, { status: 201 });
}

// GET /api/brands  -> list brands for the current tenant
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