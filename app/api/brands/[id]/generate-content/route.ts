import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runGenerateContent } from '@/lib/pipeline';

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { gap_report_id, topic, platform } = body as {
    gap_report_id?: string;
    topic?: string;
    platform?: string;
  };

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

  const resolvedTopic = topic || 'Why workflow automation needs security built in';
  const resolvedPlatform = platform || 'linkedin';

  try {
    const content = await runGenerateContent(supabase, {
      brand,
      gap_report_id,
      topic: resolvedTopic,
      platform: resolvedPlatform,
    });
    return NextResponse.json({ ok: true, via: 'api', content });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Content generation failed' },
      { status: 500 }
    );
  }
}
