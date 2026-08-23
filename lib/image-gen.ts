/**
 * lib/image-gen.ts
 *
 * Image generation with a quality-first cascade:
 *  1. Gemini native image models (free tier; often quota-limited)
 *  2. Hugging Face FLUX.1-schnell when HF_TOKEN is set
 *  3. Together AI FLUX.1-schnell when TOGETHER_API_KEY is set
 *  4. AI Horde Realistic Vision (no extra key; photorealistic, not Pollinations)
 *
 * Returns a data URI on success, or null so callers can degrade gracefully.
 */

export type ImageGenResult = {
  dataUri: string;
  mimeType: string;
  model: string;
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
];

const HF_FLUX_URL =
  'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
const TOGETHER_IMAGES_URL = 'https://api.together.xyz/v1/images/generations';
const HORDE_BASE = 'https://stablehorde.net/api/v2';
const HORDE_CLIENT_AGENT = 'scraperzz:1.0:hackathon';

function bytesToDataUri(bytes: ArrayBuffer, mimeType: string): string {
  const b64 = Buffer.from(bytes).toString('base64');
  return `data:${mimeType};base64,${b64}`;
}

function mimeFromResponse(res: Response, fallback: string): string {
  const raw = res.headers.get('content-type') || fallback;
  return raw.split(';')[0].trim() || fallback;
}

async function tryGemini(prompt: string, apiKey: string): Promise<ImageGenResult | null> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429) {
        console.warn(`[IMAGE-GEN] Gemini ${model} quota exceeded; trying next provider.`);
        return null;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[IMAGE-GEN] Gemini ${model} HTTP ${res.status}:`, errText.slice(0, 280));
        continue;
      }

      const json = await res.json();
      const parts: Array<{ inlineData?: { mimeType: string; data: string } }> =
        json?.candidates?.[0]?.content?.parts ?? [];

      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return {
            dataUri: `data:${mimeType};base64,${part.inlineData.data}`,
            mimeType,
            model,
          };
        }
      }

      console.warn(`[IMAGE-GEN] Gemini ${model} returned no image part.`);
    } catch (err) {
      console.warn(
        `[IMAGE-GEN] Gemini ${model} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
}

async function tryHuggingFaceFlux(prompt: string, token: string): Promise<ImageGenResult | null> {
  try {
    const res = await fetch(HF_FLUX_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_inference_steps: 4 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.warn(`[IMAGE-GEN] Hugging Face FLUX HTTP ${res.status}:`, (await res.text()).slice(0, 280));
      return null;
    }

    const mimeType = mimeFromResponse(res, 'image/png');
    if (!mimeType.startsWith('image/')) {
      console.warn('[IMAGE-GEN] Hugging Face FLUX returned non-image payload.');
      return null;
    }

    return {
      dataUri: bytesToDataUri(await res.arrayBuffer(), mimeType),
      mimeType,
      model: 'black-forest-labs/FLUX.1-schnell',
    };
  } catch (err) {
    console.warn('[IMAGE-GEN] Hugging Face FLUX failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function tryTogetherFlux(prompt: string, apiKey: string): Promise<ImageGenResult | null> {
  try {
    const res = await fetch(TOGETHER_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        response_format: 'b64_json',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.warn(`[IMAGE-GEN] Together FLUX HTTP ${res.status}:`, (await res.text()).slice(0, 280));
      return null;
    }

    const json = await res.json();
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn('[IMAGE-GEN] Together FLUX returned no image data.');
      return null;
    }

    return {
      dataUri: `data:image/png;base64,${b64}`,
      mimeType: 'image/png',
      model: 'black-forest-labs/FLUX.1-schnell',
    };
  } catch (err) {
    console.warn('[IMAGE-GEN] Together FLUX failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function tryHorde(prompt: string): Promise<ImageGenResult | null> {
  const apikey = (process.env.HORDE_API_KEY || '0000000000').trim();

  try {
    const submit = await fetch(`${HORDE_BASE}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Agent': HORDE_CLIENT_AGENT,
        apikey,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt:
          'blurry, lowres, jpeg artifacts, watermark, text, letters, logo, deformed, ugly, noisy',
        params: {
          sampler_name: 'k_euler_a',
          cfg_scale: 7,
          height: 512,
          width: 512,
          steps: 20,
          n: 1,
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['Realistic Vision'],
        r2: true,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const submitJson = await submit.json().catch(() => ({}));
    if (!submit.ok || !submitJson?.id) {
      console.warn(
        `[IMAGE-GEN] AI Horde submit HTTP ${submit.status}:`,
        JSON.stringify(submitJson).slice(0, 280)
      );
      return null;
    }

    const jobId = submitJson.id as string;
    const deadline = Date.now() + 90000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));

      const check = await fetch(`${HORDE_BASE}/generate/check/${jobId}`, {
        headers: { 'Client-Agent': HORDE_CLIENT_AGENT },
        signal: AbortSignal.timeout(15000),
      });
      const checkJson = await check.json().catch(() => ({}));

      if (checkJson?.faulted) {
        console.warn('[IMAGE-GEN] AI Horde job faulted.');
        return null;
      }

      if (!checkJson?.done) continue;

      const status = await fetch(`${HORDE_BASE}/generate/status/${jobId}`, {
        headers: { 'Client-Agent': HORDE_CLIENT_AGENT },
        signal: AbortSignal.timeout(15000),
      });
      const statusJson = await status.json().catch(() => ({}));
      const imgUrl: string | undefined = statusJson?.generations?.[0]?.img;
      const model: string = statusJson?.generations?.[0]?.model || 'Realistic Vision';

      if (!imgUrl) {
        console.warn('[IMAGE-GEN] AI Horde finished with no image URL.');
        return null;
      }

      if (imgUrl.startsWith('http')) {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(20000) });
        if (!imgRes.ok) {
          console.warn(`[IMAGE-GEN] AI Horde image download HTTP ${imgRes.status}`);
          return null;
        }
        const mimeType = mimeFromResponse(imgRes, 'image/webp');
        return {
          dataUri: bytesToDataUri(await imgRes.arrayBuffer(), mimeType),
          mimeType,
          model: `ai-horde/${model}`,
        };
      }

      const mimeType = 'image/webp';
      return {
        dataUri: `data:${mimeType};base64,${imgUrl}`,
        mimeType,
        model: `ai-horde/${model}`,
      };
    }

    console.warn('[IMAGE-GEN] AI Horde timed out waiting for a worker.');
    return null;
  } catch (err) {
    console.warn('[IMAGE-GEN] AI Horde failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Generate an image from a text prompt.
 *
 * @param prompt - Descriptive text prompt for the image
 * @param apiKey - Optional Gemini API key (defaults to GEMINI_API_KEY)
 */
export async function generateImage(
  prompt: string,
  apiKey?: string
): Promise<ImageGenResult | null> {
  const geminiKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    const gemini = await tryGemini(prompt, geminiKey);
    if (gemini) return gemini;
  } else {
    console.warn('[IMAGE-GEN] GEMINI_API_KEY is not set; skipping Gemini.');
  }

  const hfToken = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '').trim();
  if (hfToken) {
    const flux = await tryHuggingFaceFlux(prompt, hfToken);
    if (flux) return flux;
  }

  const togetherKey = (process.env.TOGETHER_API_KEY || '').trim();
  if (togetherKey) {
    const together = await tryTogetherFlux(prompt, togetherKey);
    if (together) return together;
  }

  const horde = await tryHorde(prompt);
  if (horde) return horde;

  console.error('[IMAGE-GEN] All image providers failed.');
  return null;
}
