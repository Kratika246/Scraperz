import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateImage } from '@/lib/image-gen';

/**
 * POST /api/image-gen
 * Body: { prompt: string }
 *
 * Generates an image (Pollinations, then AI Horde, then optional FLUX) and returns a
 * data URI that can be stored in generated_content.generated_image_urls[].
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { prompt } = body as { prompt?: string };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const result = await generateImage(prompt.trim());

  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Image generation failed. Pollinations and all fallbacks also failed.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    dataUri: result.dataUri,
    mimeType: result.mimeType,
    model: result.model,
  });
}
