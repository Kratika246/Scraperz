/**
 * Bright Data — Scraper Studio collectors + SERP API.
 *
 * Competitor discovery uses the Bright Data SERP API (POST /request) so it
 * works without a custom Scraper Studio collector. All other scraping steps
 * (brand website, social handles, posts) continue to use Scraper Studio.
 *
 * Scraper Studio: POST /dca/trigger?collector=c_... then poll GET /dca/dataset?id=j_...
 * SERP API:       POST https://api.brightdata.com/request { zone, url, format }
 *                 The target URL is a Google search with &brd_json=1 to get parsed JSON.
 *
 * Env vars:
 * | BRIGHTDATA_API_KEY                  | Bearer token for all requests                                         |
 * | BRIGHTDATA_SERP_ZONE                | SERP API zone name (default: "serp")                                  |
 * | BRIGHTDATA_COLLECTOR_BRAND_WEBSITE  | { url } → title, description, text, markdown, raw_html               |
 * | BRIGHTDATA_COLLECTOR_COMPETITORS    | (optional) { keyword, industry, brand_name } — Scraper Studio fallback |
 * | BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES | { url } → platform, handle, profile_url, ...                          |
 * | BRIGHTDATA_COLLECTOR_SOCIAL_CONTENT | { url, platform } → post_text / text, posted_at, likes, comments      |
 * | BRIGHTDATA_COLLECTOR_LINKEDIN_POSTS | { url } → same as social content (optional override)                  |
 * | BRIGHTDATA_COLLECTOR_X_POSTS        | { url } → same as social content (optional override)                  |
 */
import { bdclient } from '@brightdata/sdk';
import * as cheerio from 'cheerio';

let bdInstance: bdclient | null = null;
function getBdClient() {
  if (!bdInstance) {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    console.log('--- Debug loaded BRIGHTDATA_API_KEY ---');
    console.log(JSON.stringify(apiKey));
    console.log('---------------------------------------');
    if (!apiKey) {
      throw new Error('BRIGHTDATA_API_KEY is not set');
    }
    bdInstance = new bdclient({ apiKey });
  }
  return bdInstance;
}


const API_KEY = process.env.BRIGHTDATA_API_KEY || '';
const COLLECTOR_VERSION = process.env.BRIGHTDATA_COLLECTOR_VERSION; // e.g. "dev"
const SERP_ZONE = process.env.BRIGHTDATA_SERP_ZONE || 'serp_api1';

const COLLECTORS = {
  brandWebsite: process.env.BRIGHTDATA_COLLECTOR_BRAND_WEBSITE || '',
  competitors: process.env.BRIGHTDATA_COLLECTOR_COMPETITORS || '',
  socialHandles: process.env.BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES || '',
  socialContent: process.env.BRIGHTDATA_COLLECTOR_SOCIAL_CONTENT || '',
  linkedinPosts: process.env.BRIGHTDATA_COLLECTOR_LINKEDIN_POSTS || '',
  xPosts: process.env.BRIGHTDATA_COLLECTOR_X_POSTS || '',
};

function requireKey() {
  if (!API_KEY) {
    throw new Error('BRIGHTDATA_API_KEY is not set');
  }
}

function requireCollector(id: string, envName: string) {
  if (!id || !id.startsWith('c_')) {
    throw new Error(
      `${envName} must be a Scraper Studio collector ID (c_...). Configure it in .env.local.`
    );
  }
}

async function brightFetch(path: string, init: RequestInit = {}) {
  requireKey();
  const res = await fetch(`https://api.brightdata.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* raw */
  }
  return { status: res.status, body, text };
}

function collectorQuery(collectorId: string) {
  const extra = COLLECTOR_VERSION ? `&version=${encodeURIComponent(COLLECTOR_VERSION)}` : '';
  return `collector=${encodeURIComponent(collectorId)}${extra}`;
}

/**
 * Run a published Scraper Studio collector and return result rows.
 * Never calls Web Unlocker or marketplace datasets.
 */
export async function runStudioCollector(
  collectorId: string,
  envName: string,
  inputs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  requireCollector(collectorId, envName);

  const trigger = await brightFetch(`/dca/trigger?${collectorQuery(collectorId)}&queue_next=1`, {
    method: 'POST',
    body: JSON.stringify(inputs),
  });

  if (trigger.status >= 400) {
    throw new Error(
      `Scraper Studio trigger ${envName} (${collectorId}) ${trigger.status}: ${trigger.text.slice(0, 400)}`
    );
  }

  const collectionId =
    (trigger.body as { collection_id?: string; snapshot_id?: string })?.collection_id ||
    (trigger.body as { snapshot_id?: string })?.snapshot_id;

  if (!collectionId) {
    throw new Error(`Scraper Studio ${envName} did not return collection_id: ${trigger.text.slice(0, 400)}`);
  }

  const deadline = Date.now() + 300_000; // 5-minute timeout
  while (Date.now() < deadline) {
    const dataset = await brightFetch(`/dca/dataset?id=${encodeURIComponent(collectionId)}`);

    if (dataset.status === 202) {
      await sleep(5000);
      continue;
    }
    if (dataset.status >= 400) {
      throw new Error(
        `Scraper Studio dataset ${collectionId} ${dataset.status}: ${dataset.text.slice(0, 400)}`
      );
    }
    if (Array.isArray(dataset.body)) {
      return dataset.body as Record<string, unknown>[];
    }
    // Some collectors return a single object (not wrapped in an array)
    if (
      dataset.body &&
      typeof dataset.body === 'object' &&
      !('status' in (dataset.body as object) && Object.keys(dataset.body as object).length === 1)
    ) {
      const status = (dataset.body as { status?: string })?.status;
      if (status === 'failed' || status === 'error') {
        throw new Error(`Scraper Studio collection ${collectionId} failed`);
      }
      // If the object looks like a result row (has url or title or raw_html), wrap it
      const bodyObj = dataset.body as Record<string, unknown>;
      if (bodyObj.url || bodyObj.raw_html || bodyObj.title || bodyObj.text) {
        return [bodyObj];
      }
    }
    await sleep(5000);
  }

  throw new Error(`Scraper Studio collection ${collectionId} timed out after 300s`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function str(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function num(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

export function configuredCollectors() {
  return Object.fromEntries(
    Object.entries(COLLECTORS).map(([k, v]) => [k, Boolean(v && v.startsWith('c_'))])
  );
}

// lib/brightdata.ts
export async function scrapeBrandWebsite(url: string) {
  const collectorId = process.env.BRIGHTDATA_COLLECTOR_BRAND_WEBSITE || '';
  const rows = await runStudioCollector(
    collectorId,
    'BRIGHTDATA_COLLECTOR_BRAND_WEBSITE',
    [{ url }]
  );

  const row = rows[0] || {};
  return {
    text: str(row, 'text', 'markdown'),
    raw: str(row, 'raw_html', 'html'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bright Data SERP API  (POST https://api.brightdata.com/request)
// Used as the primary competitor-discovery mechanism.
// ─────────────────────────────────────────────────────────────────────────────

/** Domain/URL patterns that are *not* competitor company websites. */
const SKIP_DOMAINS =
  /google\.|bing\.|yahoo\.|duckduckgo\.|facebook\.|instagram\.|linkedin\.|twitter\.|x\.com|youtube\.|wikipedia\.|reddit\.|g2\.com|capterra\.|trustpilot\.|producthunt\.|getapp\.|softwareadvice\.|quora\.|glassdoor\.|clutch\.co|techcrunch\.|forbes\.|medium\.|substack\.|hubspot\./i;

/**
 * Fire a single Google search via the Bright Data SERP API and return the
 * raw parsed response body.
 *
 * @param query  - Plain-text search query
 * @param opts   - Optional country code (gl) and language (hl), defaults to US/en
 */

// lib/brightdata.ts

export async function searchBrightDataSerp(
  query: string,
  opts: { gl?: string; hl?: string } = {}
): Promise<Record<string, unknown>> {
  // POST https://api.brightdata.com/request uses Bearer token auth (the API key).
  // Basic Auth (customer-zone-name:password) is only for the direct proxy port — NOT this REST endpoint.
  if (!API_KEY) {
    throw new Error('BRIGHTDATA_API_KEY is required in .env.local');
  }

  const zone = process.env.BRIGHTDATA_SERP_ZONE || 'serp_api1';
  const { gl = 'us', hl = 'en' } = opts;
  const encodedQuery = encodeURIComponent(query);
  // brd_json=1 tells Bright Data to parse the SERP HTML and return a structured
  // JSON object. Without it the response is raw HTML and `organic` will be absent.
  const targetUrl = `https://www.google.com/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&num=10&brd_json=1`;

  const res = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone,
      url: targetUrl,
      format: 'raw',   // "raw" = return whatever Bright Data parsed (the brd_json=1 JSON)
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bright Data SERP API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Bright Data SERP API returned non-JSON (zone="${zone}"): ${text.slice(0, 400)}`
    );
  }
}

/**
 * Discover competitors for a brand using the Bright Data SERP API.
 *
 * Fires two complementary Google searches:
 *   1. "<brandName> competitors" (or "top <industry> companies" when no brandName)
 *   2. "best <industry> <brandName> alternatives" (or "<industry> software companies")
 *
 * Organic results are extracted, deduplicated by root domain, filtered of
 * irrelevant sites (aggregators, social networks, news, etc.) and scored by
 * search position.
 *
 * Falls back to the Scraper Studio collector when
 * BRIGHTDATA_COLLECTOR_COMPETITORS is explicitly configured.
 */
export async function scrapeCompetitors(
  industry: string,
  brandName?: string,
  context?: Record<string, unknown>
): Promise<
  { name: string; website_url: string; discovery_source: string; confidence_score: number; raw_data?: unknown }[]
> {
  // ── Scraper Studio fallback ────────────────────────────────────────────────
  if (COLLECTORS.competitors && COLLECTORS.competitors.startsWith('c_')) {
    const keyword = brandName
      ? `${brandName} competitors ${industry}`
      : `top ${industry} software companies competitors`;

    const rows = await runStudioCollector(
      COLLECTORS.competitors,
      'BRIGHTDATA_COLLECTOR_COMPETITORS',
      [{ keyword, industry, brand_name: brandName || '' }]
    );

    const hits: ReturnType<typeof scrapeCompetitors> extends Promise<infer T> ? T : never[] = [];
    for (const [i, row] of rows.entries()) {
      const website_url = str(row, 'website_url', 'url', 'link', 'domain');
      if (!website_url || SKIP_DOMAINS.test(website_url)) continue;
      const href = website_url.startsWith('http') ? website_url : `https://${website_url}`;
      hits.push({
        name:
          str(row, 'name', 'title', 'company') ||
          new URL(href).hostname.replace(/^www\./, ''),
        website_url: href,
        discovery_source: 'brightdata-scraper-studio',
        confidence_score:
          num(row, 'confidence_score', 'score') || Math.max(0.5, 0.95 - i * 0.05),
        raw_data: row,
      });
    }
    if (hits.length > 0) return hits;
    // fall through to SERP API if the collector returned nothing
  }

  // ── Bright Data SERP API (primary) ────────────────────────────────────────
  const queries = brandName
    ? [
      `"${brandName}" competitors alternatives ${industry}`,
      `best ${industry} tools alternative to "${brandName}"`,
    ]
    : [
      `top ${industry} companies competitors`,
      `best ${industry} software tools`,
    ];

  // Collect organic results from both queries in parallel
  const serpResults = await Promise.allSettled(
    queries.map((q) => searchBrightDataSerp(q))
  );

  // Extract the organic array from each SERP response
  type OrganicResult = {
    link?: string;
    url?: string;
    title?: string;
    description?: string;
    position?: number;
    organic_position?: number;
    global_rank?: number;
  };

  const allOrganic: Array<{ result: OrganicResult; queryIdx: number }> = [];
  for (const [idx, settled] of serpResults.entries()) {
    if (settled.status === 'rejected') {
      console.warn(`SERP query ${idx} failed:`, settled.reason);
      continue;
    }
    const body = settled.value;

    // Debug: log top-level keys so we know the exact structure Bright Data returns
    if (idx === 0) {
      console.log('[SERP] response top-level keys:', Object.keys(body));
    }

    const organic = (body.organic ?? body.results ?? body.general ?? []) as OrganicResult[];
    for (const result of organic) {
      allOrganic.push({ result, queryIdx: idx });
    }
  }


  if (allOrganic.length === 0) {
    console.warn('Bright Data SERP API returned no organic results for queries:', queries);
    return [];
  }

  // Deduplicate by root domain, filter irrelevant sites, build output list
  const seen = new Set<string>();
  const hits: {
    name: string;
    website_url: string;
    discovery_source: string;
    confidence_score: number;
    raw_data?: unknown;
  }[] = [];

  // Sort: first query results first, then by position ascending
  allOrganic.sort((a, b) => {
    if (a.queryIdx !== b.queryIdx) return a.queryIdx - b.queryIdx;
    const posA = a.result.position ?? a.result.organic_position ?? 99;
    const posB = b.result.position ?? b.result.organic_position ?? 99;
    return posA - posB;
  });

  for (const { result, queryIdx } of allOrganic) {
    const rawUrl = result.link ?? result.url ?? '';
    if (!rawUrl) continue;

    // Normalise to a proper URL with protocol
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    let urlObj: URL;
    try {
      urlObj = new URL(href);
    } catch {
      continue;
    }

    // Skip social / aggregator / news domains
    if (SKIP_DOMAINS.test(urlObj.hostname)) continue;

    // Skip the brand's own domain
    if (
      brandName &&
      urlObj.hostname.toLowerCase().replace(/^www\./, '').includes(brandName.toLowerCase().replace(/\s+/g, ''))
    ) {
      continue;
    }

    // Deduplicate on root domain (strip www.)
    const domain = urlObj.hostname.replace(/^www\./, '').toLowerCase();
    if (seen.has(domain)) continue;
    seen.add(domain);

    // Use the canonical homepage URL (scheme + hostname only)
    const website_url = `${urlObj.protocol}//${urlObj.hostname}`;

    // Derive a human-readable name from the page title or domain
    const rawTitle = result.title ?? '';
    // Strip common SERP noise like "- Home", "| Company", etc.
    const name =
      rawTitle
        .split(/[\-|–—:]/)[0]
        .trim()
        .replace(/^(Top|Best|\d+)\s+/i, '')
        .slice(0, 80) || domain.split('.')[0];

    // Confidence score: position 1 → 0.95, position 10 → 0.55, second query −0.1
    const position =
      result.position ?? result.organic_position ?? result.global_rank ?? 10;
    const base = Math.max(0.4, 0.97 - (position - 1) * 0.04);
    const confidence_score = parseFloat(
      Math.max(0.4, base - queryIdx * 0.1).toFixed(2)
    );

    hits.push({
      name,
      website_url,
      discovery_source: 'brightdata-serp-api',
      confidence_score,
      raw_data: {
        title: rawTitle,
        description: result.description,
        position,
        query: queries[queryIdx],
      },
    });

    // Cap at 15 competitors to keep things manageable
    if (hits.length >= 15) break;
  }

  return hits;
}

const SOCIAL_URL_KEYS: { platform: string; keys: string[] }[] = [
  { platform: 'linkedin', keys: ['linkedin_url', 'linkedin'] },
  { platform: 'twitter', keys: ['twitter_url', 'x_url', 'twitter', 'x'] },
  { platform: 'instagram', keys: ['instagram_url', 'instagram'] },
  { platform: 'youtube', keys: ['youtube_url', 'youtube'] },
  { platform: 'facebook', keys: ['facebook_url', 'facebook'] },
  { platform: 'tiktok', keys: ['tiktok_url', 'tiktok'] },
];
const ariaLabelMap: Record<string, string> = {
  GitHub: 'github',
  LinkedIn: 'linkedin',
  'X (Twitter)': 'twitter',
  Twitter: 'twitter',
  Discord: 'discord',
  Youtube: 'youtube',
  YouTube: 'youtube',
  Facebook: 'facebook',
  Instagram: 'instagram',
  TikTok: 'tiktok',
};

const domainToPlatform: Record<string, string> = {
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  'linkedin.com': 'linkedin',
  'github.com': 'github',
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'discord.com': 'discord',
  'discord.gg': 'discord',
  'tiktok.com': 'tiktok',
};

function resolveUrl(href: string, baseUrl: string): URL | null {
  try {
    return href.startsWith('http') ? new URL(href) : new URL(href, baseUrl);
  } catch {
    return null;
  }
}

function extractHandle(platform: string, url: URL): string {
  const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (platform === 'linkedin') {
    const idx = segments.findIndex((s) => s === 'company' || s === 'in');
    return (idx >= 0 ? segments[idx + 1] : segments[0] || '')?.replace(/^@/, '') || '';
  }
  return (segments[0] || '').replace(/^@/, '');
}

export async function scrapeSocialHandles(websiteUrl: string) {
  // 1. Dedicated social handles collector from Scraper Studio if configured
  if (COLLECTORS.socialHandles && COLLECTORS.socialHandles.startsWith('c_')) {
    const rows = await runStudioCollector(
      COLLECTORS.socialHandles,
      'BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES',
      [{ url: websiteUrl }]
    );

    return rows.map((row) => ({
      platform: str(row, 'platform'),
      handle: str(row, 'handle'),
      profile_url: str(row, 'profile_url', 'url'),
      verified: true,
      verification_confidence: num(row, 'verification_confidence', 'confidence') || 0.9,
    }));
  }

  let html = '';

  // 2. Reuse the brand website Scraper Studio collector — fetch raw HTML directly
  if (COLLECTORS.brandWebsite && COLLECTORS.brandWebsite.startsWith('c_')) {
    const rows = await runStudioCollector(
      COLLECTORS.brandWebsite,
      'BRIGHTDATA_COLLECTOR_BRAND_WEBSITE',
      [{ url: websiteUrl }]
    );
    const row = rows[0] || {};
    // Prefer raw HTML so cheerio can extract links; fall back to markdown/text
    html = str(row, 'raw_html', 'html', 'markdown', 'text');
  } else {
    // 3. Fall back to Web Unlocker if no Scraper Studio collectors are available
    const bd = getBdClient();
    try {
      html = (await bd.scrapeUrl(websiteUrl, {
        dataFormat: 'html',
        // country: 'us', // optional
      })) as string;
    } catch (error: any) {
      console.error('--- Bright Data scrapeUrl Error Details ---');
      console.error('Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      console.error('Full Error Object:', error);
      console.error('-------------------------------------------');
      throw error;
    }
  }

  const $ = cheerio.load(html);
  const links: {
    platform: string;
    handle: string;
    profile_url: string;
    [key: string]: string;
  }[] = [];
  const seen = new Set<string>();

  const push = (platform: string, url: URL) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    links.push({
      platform,
      handle: extractHandle(platform, url),
      profile_url: url.href,
      [`${platform}_url`]: url.href,
    });
  };

  // 1. aria-label based (most reliable)
  Object.entries(ariaLabelMap).forEach(([label, platform]) => {
    $(`a[aria-label="${label}"]`).each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = resolveUrl(href, websiteUrl);
      if (url) push(platform, url);
    });
  });

  // 2. href domain matching fallback
  if (links.length === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      for (const [domain, platform] of Object.entries(domainToPlatform)) {
        if (href.includes(domain)) {
          const url = resolveUrl(href, websiteUrl);
          if (url) push(platform, url);
          break;
        }
      }
    });
  }

  // 3. raw HTML regex fallback (catches JS-embedded links)
  if (links.length === 0) {
    const rawHtml = $.html();
    const regex =
      /https?:\/\/(www\.)?(linkedin\.com\/(company|in)\/[^\s"'<>]+|(twitter\.com|x\.com)\/[^\s"'<>]+|github\.com\/[^\s"'<>]+|instagram\.com\/[^\s"'<>]+|youtube\.com\/[^\s"'<>]+|facebook\.com\/[^\s"'<>]+|tiktok\.com\/[^\s"'<>]+|discord\.(com\/invite|gg)\/[^\s"'<>]+)/gi;
    const matches = rawHtml.match(regex) || [];
    matches.forEach((href) => {
      const url = resolveUrl(href, websiteUrl);
      if (!url) return;
      for (const [domain, platform] of Object.entries(domainToPlatform)) {
        if (url.href.includes(domain)) {
          push(platform, url);
          break;
        }
      }
    });
  }

  return links.map((l) => ({
    platform: l.platform,
    handle: l.handle,
    profile_url: l.profile_url,
    verified: true,
    verification_confidence: 0.9,
  }));
}
function contentCollectorFor(platform: string, profileUrl: string) {
  const p = platform.toLowerCase();
  if ((p === 'linkedin' || /linkedin\.com/i.test(profileUrl)) && COLLECTORS.linkedinPosts) {
    return { id: COLLECTORS.linkedinPosts, env: 'BRIGHTDATA_COLLECTOR_LINKEDIN_POSTS' };
  }
  if ((p === 'twitter' || /twitter\.com|x\.com/i.test(profileUrl)) && COLLECTORS.xPosts) {
    return { id: COLLECTORS.xPosts, env: 'BRIGHTDATA_COLLECTOR_X_POSTS' };
  }
  return { id: COLLECTORS.socialContent, env: 'BRIGHTDATA_COLLECTOR_SOCIAL_CONTENT' };
}

export async function scrapeSocialContent(profileUrl: string, platform: string) {
  const { id, env } = contentCollectorFor(platform, profileUrl);
  const rows = await runStudioCollector(id, env, [{ url: profileUrl, platform }]);

  return rows
    .map((row) => ({
      platform,
      content_type: (str(row, 'content_type') || 'post') as string,
      text: str(row, 'post_text', 'text', 'caption', 'description', 'title').slice(0, 2000),
      media_urls: (row.media_urls as string[]) || (row.images as string[]) || [],
      posted_at: str(row, 'posted_at', 'date_posted', 'created_at') || new Date().toISOString(),
      engagement_metrics: {
        likes: num(row, 'likes', 'num_likes'),
        comments: num(row, 'comments', 'num_comments'),
        shares: num(row, 'shares', 'num_shares', 'reposts'),
      },
    }))
    .filter((item) => item.text);
}
