# Autonomous Self-Healing Scraper Engine

> **"Into the Scrape-Verse"** — An intelligent 5-tier scraper resilience architecture (`lib/self_healing.ts`) ensuring reliable scraping even when target website DOM layouts, class names, or selectors change.

---

## 1. Why Self-Healing?

Modern websites frequently update HTML class names (e.g., Tailwind hashed classes), replace semantic elements with nested divs, or modify URL routing conventions. Traditional scrapers crash when single CSS selectors fail. 

Scraperzz avoids breakage through a multi-tiered failover engine that dynamically falls back to heuristic matching and LLM-guided DOM structural recovery.

---

## 2. The 5-Tier Resilience Hierarchy

```
 Tier 1 ─── Bright Data Scraper Studio & Datasets
            Managed API collectors (c_..., gd_...) for structured extraction.
            ▼ (on selector error / 0 items returned)
 Tier 2 ─── Bright Data SERP API Engine
            Google SERP parsing (brd_json=1) to discover rivals or alternate links.
            ▼ (on page structural shift)
 Tier 3 ─── Semantic DOM & Aria Attribute Matching
            Cheerio-based heuristic analysis: <article>, [role="article"],
            aria-labels, header landmarks, and schema.org microdata.
            ▼ (on obfuscated classnames)
 Tier 4 ─── Regex & Path Prefix Heuristic Scanning
            Scans raw HTML for link patterns (/blog/*, /news/*),
            social profile patterns, and markdown anchor tags.
            ▼ (on complete DOM obfuscation)
 Tier 5 ─── AI Structural DOM Repair (Groq LLM Engine)
            Passes raw HTML snippets to Groq (aiRepairExtraction) to
            parse structured data directly via semantic understanding.
```

---

## 3. Tier 5: AI Structural DOM Repair (`aiRepairExtraction`)

When all static parser rules fail to extract expected elements from a target page, the system invokes `aiRepairExtraction()` in [`lib/self_healing.ts`](../lib/self_healing.ts):

```typescript
export async function aiRepairExtraction<T>(
  rawHtml: string,
  targetDescription: string,
  fallback: T
): Promise<T> {
  const truncatedHtml = rawHtml.slice(0, 16000);
  const prompt = `The web page layout or DOM selectors changed on the target site.
Analyze this raw HTML markup and extract structured JSON matching the requirement: ${targetDescription}.

HTML Snippet:
${truncatedHtml}

Return JSON only matching the schema requirement without conversational preamble.`;

  return await chatJson<T>(
    'You are an autonomous self-healing web scraper recovery engine.',
    prompt,
    fallback
  );
}
```

---

## 4. Real-Time Telemetry & Monitoring

Every auto-repair action triggers a telemetry record captured in memory and surfaced across both API and UI:

### Telemetry Record Schema

```typescript
export type SelfHealingLog = {
  id?: string;
  timestamp: string;
  url: string;
  target_feature: string;      // e.g. 'social_handles', 'blog_posts'
  failure_reason: string;      // e.g. 'DOM class names modified & aria-labels absent'
  healing_strategy: string;    // e.g. 'AI Structural DOM Repair (Groq Parser)'
  items_recovered: number;     // Number of data items successfully rescued
};
```

### Telemetry Surfaces
- **Telemetry Endpoint**: `GET /api/self-healing`
- **Live UI Widget**: Visible in the Competitors Dashboard under the **Self-Healing Monitor** badge.
