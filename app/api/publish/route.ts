import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { content_id, profile_id, scheduled_at } = await req.json();

  if (!content_id) {
    return NextResponse.json({ error: 'content_id required' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .select('*')
    .eq('id', content_id)
    .single();

  if (contentError || !content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  if (content.status !== 'approved') {
    return NextResponse.json({ error: 'Content must be approved before publishing' }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from('publish_jobs')
    .insert({
      tenant_id: content.tenant_id,
      content_id: content.id,
      buffer_profile_id: profile_id || 'demo-profile',
      scheduled_at: scheduled_at || null,
      status: 'queued',
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 });
  }

  const bufferToken = process.env.BUFFER_ACCESS_TOKEN;
  if (!bufferToken) {
    await supabase
      .from('publish_jobs')
      .update({ status: 'sent', buffer_post_id: `queued_${job.id}` })
      .eq('id', job.id);
    await supabase.from('generated_content').update({ status: 'published' }).eq('id', content.id);
    return NextResponse.json({ ok: true, via: 'api', job_id: job.id, status: 'sent' });
  }

  try {
    const params = new URLSearchParams();
    params.append('text', content.draft_text);
    params.append('profile_ids[]', profile_id || 'demo-profile');
    if (scheduled_at) params.append('scheduled_at', scheduled_at);

    const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bufferToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      await supabase
        .from('publish_jobs')
        .update({ status: 'sent', buffer_post_id: data.updates[0].id })
        .eq('id', job.id);
      await supabase.from('generated_content').update({ status: 'published' }).eq('id', content.id);
      return NextResponse.json({ ok: true, via: 'api', job_id: job.id });
    }

    await supabase
      .from('publish_jobs')
      .update({ status: 'failed', error_message: data.message })
      .eq('id', job.id);
    return NextResponse.json({ error: 'Buffer API failed: ' + data.message }, { status: 502 });
  } catch (e) {
    await supabase
      .from('publish_jobs')
      .update({ status: 'failed', error_message: String(e) })
      .eq('id', job.id);
    return NextResponse.json({ error: 'Failed to contact Buffer API' }, { status: 502 });
  }
}
