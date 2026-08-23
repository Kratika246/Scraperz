import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getActiveBufferToken,
  resolveBufferPostUrl,
  bufferDashboardPostUrl,
} from '@/lib/buffer';

function isFakeNetworkUrl(url?: string | null) {
  if (!url) return true;
  if (url.includes('publish.buffer.com') || url.includes('buffer.com')) return false;
  if (url.includes('linkedin.com/feed/update/urn:li:activity:')) {
    const id = url.split('urn:li:activity:')[1] || '';
    if (/^[a-f0-9]{24}$/i.test(id) || id.startsWith('17892348') || id.startsWith('buf_')) {
      return true;
    }
  }
  if (url.includes('17892348') || url.includes('1789234890123984')) return true;
  return false;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const token = await getActiveBufferToken(supabase, tenantId);
  if (!token) {
    return NextResponse.json(
      { error: 'Buffer token is not saved. Add it in Settings first.' },
      { status: 400 }
    );
  }

  const { data: jobs, error: jobsError } = await supabase
    .from('publish_jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('buffer_post_id', 'is', null)
    .order('created_at', { ascending: false });

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  const refreshed: Array<{
    job_id: string;
    content_id: string;
    buffer_post_id: string;
    published_url: string;
    live: boolean;
    buffer_status?: string;
  }> = [];

  for (const job of jobs || []) {
    const postId = String(job.buffer_post_id || '');
    if (!postId || postId.startsWith('demo') || postId.startsWith('buf_')) {
      continue;
    }

    try {
      const resolved = await resolveBufferPostUrl(token, postId, 2);
      const nextUrl = resolved.live
        ? resolved.url
        : isFakeNetworkUrl(job.published_url)
          ? bufferDashboardPostUrl(postId)
          : job.published_url;

      await supabase
        .from('publish_jobs')
        .update({
          published_url: nextUrl,
          status: resolved.status === 'error' ? 'failed' : 'published',
          error_message: resolved.status === 'error' ? 'Buffer reported a publishing error' : null,
        })
        .eq('id', job.id);

      if (job.content_id) {
        await supabase
          .from('generated_content')
          .update({ published_url: nextUrl })
          .eq('id', job.content_id);
      }

      refreshed.push({
        job_id: job.id,
        content_id: job.content_id,
        buffer_post_id: postId,
        published_url: nextUrl,
        live: resolved.live,
        buffer_status: resolved.status,
      });
    } catch (err) {
      console.warn(
        '[PUBLISH REFRESH]',
        postId,
        err instanceof Error ? err.message : err
      );
    }
  }

  const { data: content } = await supabase
    .from('generated_content')
    .select('*')
    .eq('tenant_id', tenantId)
    .or('status.eq.published,published_url.not.is.null')
    .order('updated_at', { ascending: false });

  return NextResponse.json({
    ok: true,
    refreshed: refreshed.length,
    posts: refreshed,
    content: content || [],
  });
}
