import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runDiscoverCompetitors } from '@/lib/pipeline';

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

  const { data: brand, error } = await supabase
    .from('brands')
    .select('id, tenant_id, name, context')
    .eq('id', id)
    .single();

  if (error || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  if (!brand.context) {
    return NextResponse.json({ error: 'Brand context not yet built.' }, { status: 400 });
  }

  await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'running' })
    .eq('id', brand.id);

  try {
    await runDiscoverCompetitors(supabase, brand);
  } catch (err) {
    console.error(err);
    await supabase
      .from('brands')
      .update({ competitor_discovery_status: 'failed' })
      .eq('id', brand.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 502 }
    );
  }

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    ok: true,
    status: 'done',
    via: 'api',
    competitors: competitors || [],
  });
}
