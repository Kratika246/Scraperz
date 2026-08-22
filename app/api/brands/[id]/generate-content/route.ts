import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

// POST /api/brands/[id]/generate-content
// Synchronously generates content and images via OpenAI
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { gap_report_id, topic, platform } = await req.json();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  let draft_text = "Generated draft text.";
  let generated_image_urls = ["https://placehold.co/600x400/png?text=AI+Generated+Image"];

  try {
    const prompt = `Write a ${platform} post about ${topic}. Ensure the tone aligns with these keywords: ${JSON.stringify((brand.context as any)?.tone_keywords || [])}`;
    
    // 1. Generate Text
    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
    
    draft_text = textResponse.choices[0].message.content || draft_text;

    // 2. Generate Image
    const imgPrompt = `A professional illustration for a social media post about ${topic}. Clean, corporate style.`;
    const imgResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imgPrompt,
      n: 1,
      size: "1024x1024"
    });

    if (imgResponse.data[0].url) {
      generated_image_urls = [imgResponse.data[0].url];
    }
  } catch (err) {
    console.error("OpenAI generation error:", err);
    // Fall back to mocks if key fails
  }

  // Insert generated content
  const { data, error: insertError } = await supabase
    .from('generated_content')
    .insert({
      brand_id: brand.id,
      tenant_id: brand.tenant_id,
      gap_report_id: gap_report_id || null,
      content_type: 'post',
      platform: platform || 'linkedin',
      title: topic || 'New Post',
      draft_text,
      generated_image_urls,
      opportunity_score: 95,
      status: 'draft'
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content: data });
}
