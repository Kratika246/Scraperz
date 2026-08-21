import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/publish
// Send approved content to Buffer API
export async function POST(req: NextRequest) {
  const { content_id, profile_id, scheduled_at } = await req.json();

  if (!content_id || !profile_id) {
    return NextResponse.json({ error: 'content_id and profile_id required' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get approved content
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

  // Create publish job record
  const { data: job, error: jobError } = await supabase
    .from('publish_jobs')
    .insert({
      tenant_id: content.tenant_id,
      content_id: content.id,
      buffer_profile_id: profile_id,
      scheduled_at: scheduled_at || null,
      status: 'queued'
    })
    .select()
    .single();

  if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  // In a real app, you would call Buffer API here directly, or trigger a webhook.
  // For the hackathon, we simulate sending to Buffer.
  try {
     const bufferToken = process.env.BUFFER_ACCESS_TOKEN;
     if (!bufferToken) {
         console.warn("BUFFER_ACCESS_TOKEN not set, simulating successful queue");
         // Simulate successful queue
         await supabase.from('publish_jobs').update({ status: 'sent', buffer_post_id: 'mock_buffer_id' }).eq('id', job.id);
         return NextResponse.json({ ok: true, job_id: job.id, status: 'sent (simulated)' });
     }
     
     // Example Buffer API call
     const params = new URLSearchParams();
     params.append('text', content.draft_text);
     params.append('profile_ids[]', profile_id);
     if (scheduled_at) params.append('scheduled_at', scheduled_at);
     // Note: media (images) handling via Buffer API goes here
     
     const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
         method: 'POST',
         headers: {
             'Authorization': `Bearer ${bufferToken}`,
             'Content-Type': 'application/x-www-form-urlencoded'
         },
         body: params.toString()
     });
     
     const data = await res.json();
     
     if (res.ok && data.success) {
         await supabase.from('publish_jobs').update({ status: 'sent', buffer_post_id: data.updates[0].id }).eq('id', job.id);
         return NextResponse.json({ ok: true, job_id: job.id });
     } else {
         await supabase.from('publish_jobs').update({ status: 'failed', error_message: data.message }).eq('id', job.id);
         return NextResponse.json({ error: 'Buffer API failed: ' + data.message }, { status: 500 });
     }
     
  } catch(e) {
      console.error(e);
      await supabase.from('publish_jobs').update({ status: 'failed', error_message: String(e) }).eq('id', job.id);
      return NextResponse.json({ error: 'Failed to contact Buffer API' }, { status: 500 });
  }
}
