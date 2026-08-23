# Image Generation Guide: Free API vs. NanoBanana

COMPETE automatically synthesizes contextual, branded header images for **Blog Articles** and graphical media for **Social Media Posts**.

---

## 1. Overview & Image Strategy

When content is drafted via `POST /api/brands/:id/generate-content`, the backend generates a visual prompt tailored to the article title or social topic, then assigns an image URL to the record in `generated_content.image_url`.

The system supports two complementary image generation approaches:
1. **Pollinations AI (Currently Active / Free Tier)**: Immediate zero-setup solution.
2. **NanoBanana (Production / High-Quality Tier)**: Enterprise-grade consistent image generation API.

---

## 2. Option A: Pollinations AI (Currently Active · Free Tier)

[Pollinations](https://pollinations.ai) is an open-source, zero-authentication image generation API.

### How It Works in Scraperzz

Pollinations dynamically serves generated images on-demand directly via a parameterized URL. There is **no API key** or account creation needed.

**Implementation in [`lib/llm.ts`](../lib/llm.ts):**

```typescript
export function pollinationsImageUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?nologo=true&width=1024&height=1024`;
}
```

### Prompt Construction in Pipeline (`lib/pipeline.ts`)

```typescript
const imagePrompt = `Professional blog header: ${title}, modern flat design, tech aesthetic, corporate color palette, high resolution, minimalist`;
const imageUrl = pollinationsImageUrl(imagePrompt);
```

### Key Characteristics
- **Cost**: 100% Free
- **Authentication**: None required
- **Format**: Dynamic URL loaded directly by the browser `<img>` element
- **Resolution**: 1024 × 1024
- **Best For**: Development, testing, hackathons, and zero-cost prototyping.

---

## 3. Option B: NanoBanana (Target Production Tier)

[NanoBanana](https://nanobanana.ai) provides dedicated generative image endpoints tailored for programmatic content pipelines, with predictable latency, high fidelity, and brand style consistency.

### Setup & Credentials

1. Register at [nanobanana.ai](https://nanobanana.ai) and obtain an API key.
2. Add the following to your `.env.local`:

```env
NANOBANANA_API_KEY=nb_live_xxxxxxxxxxxxxxxxxxxxxxxx
NANOBANANA_API_URL=https://api.nanobanana.ai/v1/generate
```

### Integration Code

Add the helper in [`lib/llm.ts`](../lib/llm.ts):

```typescript
export async function nanoBananaImageUrl(prompt: string): Promise<string> {
  const apiKey = process.env.NANOBANANA_API_KEY;
  const apiUrl = process.env.NANOBANANA_API_URL || 'https://api.nanobanana.ai/v1/generate';

  if (!apiKey) {
    // Graceful fallback to Pollinations if NanoBanana key is absent
    console.warn('[IMAGE GEN] NANOBANANA_API_KEY not found, falling back to Pollinations.');
    return pollinationsImageUrl(prompt);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: 1024,
      height: 1024,
      style: 'corporate_clean', // or 'editorial_illustration'
      format: 'webp',
      enhance_prompt: true,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[IMAGE GEN] NanoBanana request failed: ${errorText}`);
    return pollinationsImageUrl(prompt); // Safe fallback
  }

  const data = await response.json();
  return data.url || data.image_url;
}
```

### Updating the Generation Pipeline (`lib/pipeline.ts`)

In `generateBrandBlogArticle` and `generateBrandSocialPost`:

```typescript
// Replace:
// const imageUrl = pollinationsImageUrl(imagePrompt);

// With async generator:
const imageUrl = await nanoBananaImageUrl(imagePrompt);
```

---

## 4. Feature Comparison Matrix

| Feature | Pollinations AI (Free) | NanoBanana (Production) |
|---|---|---|
| **Pricing** | $0 (Free) | Pay-per-generation / Subscription |
| **API Key Requirement** | None | Required (`NANOBANANA_API_KEY`) |
| **Generation Latency** | 2–8 seconds (cold start) | ~1–3 seconds with guaranteed SLA |
| **Image Resolution** | 1024 × 1024 | Up to 2048 × 2048 / Custom Ratios |
| **Output Formats** | JPEG | WebP, PNG, JPEG |
| **Brand Style Presets** | N/A (Prompt only) | Supported (Corporate, Minimalist, 3D, Editorial) |
| **Uptime Guarantee** | Best-effort community | 99.9% Production SLA |
| **Prompt Enhancement** | Basic | Advanced semantic LLM expansion |

---

## 5. Recommended Prompting Best Practices

For optimal marketing visuals across both engines:

1. **Specify Mood & Medium**: Include style modifiers like `"modern vector illustration"`, `"editorial graphic"`, or `"minimalist SaaS dashboard concept"`.
2. **Color Harmony**: Append brand-aligned color cues such as `"navy and slate blue palette"`, `"clean white background"`.
3. **Avoid Unwanted Artifacts**: Append `--no text, watermark, blurry, deformed` or define `"clean composition without typography"`.
