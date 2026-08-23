# Image Generation Architecture & Model Guide

COMPETE automatically generates contextual, branded visual assets for **Blog Article Headers** and **Social Media Posts**. The image generation pipeline implements a **free-first cascade with graceful multi-model fallbacks** and dedicated support for **premium generative models**.

---

## 1. Multi-Tier Image Generation Cascade

The core image engine in [`lib/image-gen.ts`](../lib/image-gen.ts) executes a resilient failover cascade:

```
                  ┌────────────────────────────────────────┐
                  │       Visual Prompt Formulation        │
                  │        (lib/pipeline.ts & Groq)        │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Image Generator (lib/image-gen.ts)  │
                  └───────────────────┬────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │ 1. Free Default            │ 2. Distributed Free        │ 3. Premium / API Key
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌────────────────────────┐
│  Pollinations AI │ ──fail─►│     AI Horde     │ ──fail─►│   HuggingFace / Together│
│  (Zero API Key)  │         │ (Realistic Vision│         │   FLUX.1-schnell /     │
│  · High speed    │         │  Community Grid) │         │   NanoBanana (Premium) │
│  · 1024×1024     │         └──────────────────┘         └────────────────────────┘
└──────────────────┘
```

---

## 2. Default Engines (Zero Setup / Free Tier)

### Tier 1: Pollinations AI
- **Status**: Default active generator.
- **Setup**: Zero configuration, no API key required.
- **Speed**: ~2–5 seconds on-demand URL rendering.
- **Models**: Defaults to `flux` with support for `flux-realism`, `flux-3d`, `turbo`.

**Implementation snippet (`lib/image-gen.ts`):**
```typescript
function pollinationsImageUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?nologo=true&width=1024&height=1024`;
}
```

### Tier 2: AI Horde (Realistic Vision)
- **Status**: Automatic fallback if Pollinations is unreachable.
- **Setup**: Zero configuration (uses public client agent `scraperzz:1.0:hackathon`).
- **Model**: `Realistic Vision` on distributed community workers.

---

## 3. Premium Models for High-Fidelity Generation

For production environments requiring **custom aspect ratios (16:9 blog headers, 1:1 square feeds), higher resolution (2K/4K), brand aesthetic lock-in, and strict latency SLAs**, Scraperzz supports premium model backends:

### A. Hugging Face FLUX.1-schnell
- **Setup**: Set `HF_TOKEN` in `.env.local`.
- **Model**: `black-forest-labs/FLUX.1-schnell` via serverless inference endpoint.

### B. Together AI FLUX.1-schnell
- **Setup**: Set `TOGETHER_API_KEY` in `.env.local`.
- **Model**: Direct fast FLUX.1 generation returning base64 images.

### C. NanoBanana / DALL-E 3 (Enterprise Generation)
- **Setup**: Set `NANOBANANA_API_KEY` and `NANOBANANA_API_URL` in `.env.local`.
- **Strengths**: Strict brand styling presets, typography rendering, commercial SLA.

---

## 4. Environment Configuration

Add optional keys in `.env.local` to enable premium tiers:

```env
# Optional: Hugging Face FLUX
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Together AI FLUX
TOGETHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: NanoBanana Enterprise
NANOBANANA_API_KEY=nb_live_xxxxxxxxxxxxxxxxxxx
NANOBANANA_API_URL=https://api.nanobanana.ai/v1/generate
```

---

## 5. Standalone Image Generation API

The system exposes a dedicated authenticated image generation endpoint:

- **Endpoint**: `POST /api/image-gen`
- **Request Body**:
  ```json
  {
    "prompt": "Modern isometric SaaS dashboard concept, blue and dark slate tones, minimalist"
  }
  ```
- **Response** `(200 OK)`:
  ```json
  {
    "ok": true,
    "dataUri": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "model": "pollinations/flux"
  }
  ```

---

## 6. Feature Comparison Matrix

| Feature | Pollinations AI (Free Default) | AI Horde (Free Fallback) | FLUX.1 / NanoBanana (Premium) |
|---|---|---|---|
| **Cost** | $0 (Free) | $0 (Free) | Pay-per-generation / Subscription |
| **API Key Setup** | None | None | `HF_TOKEN` / `TOGETHER_API_KEY` / `NANOBANANA_API_KEY` |
| **Generation Time** | 2–5s | 10–25s | 1–3s (Guaranteed SLA) |
| **Resolution** | 1024 × 1024 | 512 × 512 | Up to 2048 × 2048 / Custom aspect ratios |
| **Output Formats** | JPEG | WebP | PNG, WebP, JPEG |
| **Brand Style Lock-in** | Prompt-guided | Prompt-guided | Strict style presets |
| **Uptime Guarantee** | Best-effort | Community-dependent | 99.9% Production SLA |
