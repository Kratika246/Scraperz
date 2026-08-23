# Image Generation Guide: Free API (Pollinations) & Premium Models (NanoBanana, Flux, etc.)

COMPETE automatically synthesizes contextual, branded header images for **Blog Articles** and graphical media for **Social Media Posts**.

---

## 1. Overview & Image Strategy

When content is drafted via `POST /api/brands/:id/generate-content`, the backend generates a visual prompt tailored to the article title or social topic, then assigns an image URL to the record in `generated_content.image_url`.

The system is configured with **Pollinations AI** as the default free engine, with built-in architecture to switch to **Premium Models** (such as NanoBanana, Flux Pro, DALL-E 3, or SD 3.5) for enhanced resolution, stylistic fidelity, and production SLAs.

```
                  ┌────────────────────────────────────────┐
                  │       Content Generation Pipeline      │
                  │        (lib/pipeline.ts & Groq)        │
                  └───────────────────┬────────────────────┘
                                      │ Visual Prompt
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │            Image Generation Router              │
             │                 (lib/llm.ts)                    │
             └───────────────┬─────────────────┬───────────────┘
                             │                 │
              [Default · Free]                 [Upgrade · Premium]
                             ▼                                 ▼
             ┌───────────────────────┐         ┌───────────────────────┐
             │    Pollinations AI    │         │     Premium Models    │
             │  · Zero setup / free  │         │  · NanoBanana         │
             │  · Fast on-demand URL │         │  · Flux Pro / Realism │
             │  · Configurable models│         │  · Consistent styles  │
             └───────────────────────┘         └───────────────────────┘
```

---

## 2. Default Engine: Pollinations AI (Free Tier)

[Pollinations](https://pollinations.ai) is an open, zero-authentication image generation engine that produces images on-demand directly via a parameterized URL.

### Active Implementation in [`lib/llm.ts`](../lib/llm.ts)

```typescript
export function pollinationsImageUrl(prompt: string, model: string = 'flux'): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?nologo=true&width=1024&height=1024&model=${encodeURIComponent(model)}`;
}
```

### Parameter Tuning in Pollinations
Pollinations allows selecting underlying open-weight generative models and parameters via URL query parameters:
- `model=flux` (Default): High-quality prompt comprehension and composition.
- `model=flux-realism`: Photo-realistic output.
- `model=flux-3d`: 3D stylized graphics and isometric vectors.
- `model=turbo`: Ultra-low latency generation.
- `seed=<number>`: Deterministic reproducibility.

### Prompt Construction in Pipeline (`lib/pipeline.ts`)

```typescript
const imagePrompt = `Professional blog header: ${title}, modern flat design, tech aesthetic, corporate color palette, high resolution, minimalist`;
const imageUrl = pollinationsImageUrl(imagePrompt);
```

### Key Characteristics
- **Cost**: 100% Free
- **Authentication**: None required
- **Format**: Dynamic URL rendered directly by the browser `<img>` element
- **Resolution**: 1024 × 1024
- **Best For**: Rapid development, testing, staging environments, and zero-cost operation.

---

## 3. Upgrading to Premium Models for Better Image Generation

While Pollinations is ideal for zero-setup workflows, production environments and high-tier brands often require **higher visual consistency, brand style lock-in, custom aspect ratios (e.g., 16:9 for blogs, 1:1 for LinkedIn), and dedicated latency guarantees**.

### Premium Model Providers Supported

1. **NanoBanana**: Enterprise API built for programmatic AI marketing visual generation with strict brand guidelines and preset styling.
2. **Flux Pro / Replicate**: Ultra-high fidelity (up to 2048×2048) with complex multi-object accuracy.
3. **OpenAI DALL-E 3**: Superior typographic rendering and conceptual illustration.

---

## 4. Setting Up Premium Models (e.g. NanoBanana)

### Step 1: Add Credentials to `.env.local`

```env
# Premium Image Generation
NANOBANANA_API_KEY=nb_live_xxxxxxxxxxxxxxxxxxxxxxxx
NANOBANANA_API_URL=https://api.nanobanana.ai/v1/generate
```

### Step 2: Add the Premium Client in [`lib/llm.ts`](../lib/llm.ts)

```typescript
export async function generatePremiumImageUrl(
  prompt: string,
  aspectRatio: '16:9' | '1:1' = '16:9'
): Promise<string> {
  const apiKey = process.env.NANOBANANA_API_KEY;
  const apiUrl = process.env.NANOBANANA_API_URL || 'https://api.nanobanana.ai/v1/generate';

  // Automatic graceful fallback to Pollinations if no premium key is provided
  if (!apiKey) {
    console.warn('[IMAGE GEN] No premium key configured; using Pollinations AI.');
    return pollinationsImageUrl(prompt);
  }

  const dimensions = aspectRatio === '16:9' 
    ? { width: 1280, height: 720 } 
    : { width: 1024, height: 1024 };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        style: 'corporate_clean', // 'editorial_illustration' | 'tech_minimalist'
        format: 'webp',
        quality: 'hd',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[IMAGE GEN] Premium generation failed: ${errorText}`);
      return pollinationsImageUrl(prompt); // Fallback on failure
    }

    const data = await response.json();
    return data.url || data.image_url;
  } catch (err) {
    console.error('[IMAGE GEN] Error in premium image pipeline:', err);
    return pollinationsImageUrl(prompt);
  }
}
```

### Step 3: Use the Generator in [`lib/pipeline.ts`](../lib/pipeline.ts)

In `generateBrandBlogArticle` and `generateBrandSocialPost`:

```typescript
// Replace synchronous URL builder:
// const imageUrl = pollinationsImageUrl(imagePrompt);

// With the premium router (falls back to Pollinations automatically if no key is set):
const imageUrl = await generatePremiumImageUrl(imagePrompt, '16:9');
```

---

## 5. Free vs. Premium Model Comparison

| Feature | Pollinations AI (Free Default) | Premium Models (NanoBanana / Flux Pro) |
|---|---|---|
| **Cost** | $0 (Free) | Pay-per-generation / Subscription |
| **API Key Setup** | Zero setup (works out of the box) | API Key in `.env.local` |
| **Visual Consistency** | Good for generic concepts | Exceptional (Brand styles & lock-in) |
| **Aspect Ratios** | Fixed 1024 × 1024 | 16:9 (Blog headers), 1:1 (Social), 4:5 (Feeds) |
| **Resolution** | Standard (1024px) | HD / 2K / 4K Crisp |
| **Output Formats** | JPEG | Lossless WebP, PNG, JPEG |
| **SLA & Uptime** | Best-effort community infrastructure | 99.9% Production SLA |
| **Typography in Graphics** | Prone to distortion | Crisp, readable text rendering |

---

## 6. Prompting Best Practices for Quality Output

Regardless of the model tier selected, structure prompts following these principles:

1. **Context & Subject**: Start with the primary subject (e.g., `"Futuristic cloud architecture diagram"`).
2. **Style & Aesthetics**: Specify graphic medium (`"isometric 3D illustration"`, `"flat vector graphic"`, `"clean editorial tech style"`).
3. **Color Theme**: Define harmonious brand colors (`"slate navy, subtle cyan accents, crisp white background"`).
4. **Negative Constraints**: Exclude artifacts by appending modifiers (`"no watermark, no blurry artifacts, no distorted text"`).
