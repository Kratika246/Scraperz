/**
 * Bright Data Scraper Studio only.
 *
 * Every scrape is POST /dca/trigger?collector=c_... then poll GET /dca/dataset?id=j_...
 * Unlocker, SERP zones, and marketplace dataset_id scrapers are not used.
 *
 * Set collector IDs in env (Scraper Studio → collector URL, starts with c_).
 * Match each collector's Input tab to the payloads below.
 *
 * | Env | Typical input | Expected output fields (flexible) |
 * | BRIGHTDATA_COLLECTOR_BRAND_WEBSITE | { url } | title, description, text, markdown, raw_html |
 * | BRIGHTDATA_COLLECTOR_COMPETITORS | { keyword, industry, brand_name } | name, website_url / url / link |
 * | BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES | { url } | platform, handle, profile_url — or linkedin_url, twitter_url, ... |
 * | BRIGHTDATA_COLLECTOR_SOCIAL_CONTENT | { url, platform } | post_text / text, posted_at, likes, comments |
 * | BRIGHTDATA_COLLECTOR_LINKEDIN_POSTS | { url } | same as social content (optional override) |
 * | BRIGHTDATA_COLLECTOR_X_POSTS | { url } | same as social content (optional override) |
 */

const API_KEY = process.env.BRIGHTDATA_API_KEY || '';
const COLLECTOR_VERSION = process.env.BRIGHTDATA_COLLECTOR_VERSION; // e.g. "dev"

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

  const deadline = Date.now() + 180_000;
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
    const status = (dataset.body as { status?: string })?.status;
    if (status === 'failed' || status === 'error') {
      throw new Error(`Scraper Studio collection ${collectionId} failed`);
    }
    await sleep(5000);
  }

  throw new Error(`Scraper Studio collection ${collectionId} timed out after 180s`);
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout limit

  try {
    const res = await fetch(
      `https://api.brightdata.com/dca/trigger?collector=${process.env.BRIGHTDATA_COLLECTOR_BRAND_WEBSITE}&queue_next=1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ url }]),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Bright Data API error: ${res.statusText}`);
    
    const data = await res.json();
    return {
      text: data[0]?.text || data[0]?.markdown || '',
      raw: data[0]?.raw_html || data[0]?.html || '',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function scrapeCompetitors(industry: string, brandName?: string) {
  const keyword = brandName
    ? `${brandName} competitors ${industry}`
    : `top ${industry} software companies competitors`;

  const rows = await runStudioCollector(COLLECTORS.competitors, 'BRIGHTDATA_COLLECTOR_COMPETITORS', [
    { keyword, industry, brand_name: brandName || '' },
  ]);

  const skip = /google\.|facebook\.|instagram\.|linkedin\.|twitter\.|x\.com|youtube\.|wikipedia\.|reddit\./i;
  const hits = [];

  for (const [i, row] of rows.entries()) {
    const website_url = str(row, 'website_url', 'url', 'link', 'domain');
    if (!website_url || skip.test(website_url)) continue;
    const href = website_url.startsWith('http') ? website_url : `https://${website_url}`;
    hits.push({
      name: str(row, 'name', 'title', 'company') || new URL(href).hostname.replace(/^www\./, ''),
      website_url: href,
      discovery_source: 'brightdata-scraper-studio',
      confidence_score: num(row, 'confidence_score', 'score') || Math.max(0.5, 0.95 - i * 0.05),
    });
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

export async function scrapeSocialHandles(websiteUrl: string) {
  const rows = await runStudioCollector(COLLECTORS.socialHandles, 'BRIGHTDATA_COLLECTOR_SOCIAL_HANDLES', [
    { url: websiteUrl },
  ]);

  const handles: {
    platform: string;
    handle: string;
    profile_url: string;
    verified: boolean;
    verification_confidence: number;
  }[] = [];
  const seen = new Set<string>();

  const push = (platform: string, profile_url: string, handleHint?: string) => {
    if (!profile_url.startsWith('http') || seen.has(profile_url)) return;
    seen.add(profile_url);
    const handle =
      handleHint ||
      decodeURIComponent(profile_url.split('/').filter(Boolean).pop() || '').replace(/^@/, '');
    handles.push({
      platform,
      handle,
      profile_url,
      verified: true,
      verification_confidence: 0.9,
    });
  };

  for (const row of rows) {
    const platform = str(row, 'platform').toLowerCase();
    const profile_url = str(row, 'profile_url', 'url', 'link');
    if (platform && profile_url) {
      push(platform === 'x' ? 'twitter' : platform, profile_url, str(row, 'handle', 'username'));
      continue;
    }
    for (const { platform: p, keys } of SOCIAL_URL_KEYS) {
      const url = str(row, ...keys);
      if (url) push(p, url);
    }
  }

  return handles;
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
