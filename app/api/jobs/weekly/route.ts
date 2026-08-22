import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { unauthorizedIfBadCronSecret } from '@/lib/cron-auth';
import { runWeeklyJob } from '@/lib/pipeline';

/**
 * n8n (or any cron) only POSTs here.
 * Heavy lifting is the same pipeline functions the dashboard APIs use.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const denied = unauthorizedIfBadCronSecret(req);
  if (denied) return denied;

  const supabase = createAdminClient();

  try {
    const summary = await runWeeklyJob(supabase);
    return NextResponse.json({ ok: true, via: 'api', ran_at: new Date().toISOString(), brands: summary });
  } catch (err) {
    console.error('Weekly job failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Weekly job failed' },
      { status: 502 }
    );
  }
}
