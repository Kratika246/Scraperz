import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runGapAnalysis } from '@/lib/pipeline';

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

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  const { data: content } = await supabase
    .from('competitor_content')
    .select('text, platform, content_type')
    .eq('tenant_id', brand.tenant_id)
    .limit(20);

  const { data: report, error: insertError } = await supabase
    .from('gap_analysis_reports')
    .insert({
      tenant_id: brand.tenant_id,
      brand_id: brand.id,
      status: 'running',
    })
    .select()
    .single();

  if (insertError || !report) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create report' }, { status: 500 });
  }

  try {
    await runGapAnalysis(supabase, report.id, brand, content || []);
  } catch (err) {
    console.error(err);
    await supabase.from('gap_analysis_reports').update({ status: 'failed' }).eq('id', report.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gap analysis failed' },
      { status: 502 }
    );
  }

  const { data: latest } = await supabase
    .from('gap_analysis_reports')
    .select('*')
    .eq('id', report.id)
    .single();

  return NextResponse.json({
    ok: true,
    via: 'api',
    report: latest,
  });
}
