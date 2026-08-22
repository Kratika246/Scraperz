import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeCompetitors } from '@/lib/brightdata';

// POST /api/brands/[id]/discover-competitors
// Synchronously uses Bright Data (mocked for demo) to find competitors
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

  // Verify ownership and get brand context
  const { data: brand, error } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (error || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  if (!brand.context) {
    return NextResponse.json(
      { error: 'Brand context not yet built.' },
      { status: 400 }
    );
  }

  // 1. Update status to running
  await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'running' })
    .eq('id', brand.id);

  // 2. Call Bright Data
  const industry = (brand.context as any)?.industry || 'SaaS';
  const competitors = await scrapeCompetitors(industry);

  // 3. Insert competitors
  if (competitors.length > 0) {
    const { error: insertError } = await supabase
      .from('competitors')
      .insert(
        competitors.map((c) => ({
          brand_id: brand.id,
          tenant_id: brand.tenant_id,
          name: c.name,
          website_url: c.website_url,
          discovery_source: c.discovery_source,
          confidence_score: c.confidence_score,
          status: 'discovered'
        }))
      );

    if (insertError) {
      console.error('Failed to insert competitors:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // 4. Update brand status to done
  await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'done' })
    .eq('id', brand.id);

  // Return the newly inserted competitors
  const { data: newCompetitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ok: true, status: 'done', competitors: newCompetitors });
}
