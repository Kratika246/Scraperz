import { chatJson, chatText, pollinationsImageUrl } from '@/lib/llm';
import {
  scrapeBrandWebsite,
  scrapeCompetitors,
  scrapeSocialContent,
  scrapeSocialHandles,
} from '@/lib/brightdata';
import type { SupabaseClient } from '@supabase/supabase-js';

type BrandContext = {
  industry: string;
  tagline: string;
  target_audience: string;
  value_props: string[];
  products: string[];
  tone_keywords: string[];
};

export async function runBrandScrape(
  supabase: SupabaseClient,
  brand: { id: string; name: string; website_url?: string | null; raw_description?: string | null }
) {
  const fallback: BrandContext = {
    industry: 'SaaS',
    tagline: `${brand.name} — competitive intelligence for marketers`,
    target_audience: 'Growth and content teams at B2B companies',
    value_props: ['Save research time', 'Find content gaps', 'Publish on-brand posts'],
    products: ['Competitor intel', 'Gap analysis', 'Content drafts'],
    tone_keywords: ['Professional', 'Practical', 'Confident'],
  };

  let pageText = '';
  let scraped_raw_html: string | null = null;
  if (brand.website_url) {
    const scraped = await scrapeBrandWebsite(brand.website_url);
    pageText = scraped.text;
    scraped_raw_html = scraped.raw.slice(0, 200000);
  }

  const context = await chatJson<BrandContext>(
    'You extract structured brand context from a scraped website. Return JSON only.',
    `Brand name: ${brand.name}
Website: ${brand.website_url || 'n/a'}
Description: ${brand.raw_description || 'n/a'}
Scraped page (Bright Data): ${pageText || 'n/a'}

Return JSON with keys: industry, tagline, target_audience, value_props (string[]), products (string[]), tone_keywords (string[]).`,
    fallback
  );

  const { error } = await supabase
    .from('brands')
    .update({ status: 'ready', context, scraped_raw_html })
    .eq('id', brand.id);

  if (error) throw new Error(error.message);
  return context;
}

export async function runDiscoverCompetitors(
  supabase: SupabaseClient,
  brand: { id: string; tenant_id: string; name?: string; context: unknown }
) {
  const industry = (brand.context as { industry?: string })?.industry || 'SaaS';
  const competitors = await scrapeCompetitors(
    industry,
    brand.name,
    brand.context as Record<string, unknown>
  );

  if (competitors.length > 0) {
    const { error } = await supabase.from('competitors').upsert(
      competitors.map((c) => ({
        brand_id: brand.id,
        tenant_id: brand.tenant_id,
        name: c.name,
        website_url: c.website_url,
        discovery_source: c.discovery_source,
        confidence_score: c.confidence_score,
        raw_data: c.raw_data ?? null,
        status: 'discovered',
      })),
      { onConflict: 'brand_id,website_url' }
    );
    if (error) throw new Error(error.message);
  }

  await supabase
    .from('brands')
    .update({ competitor_discovery_status: 'done' })
    .eq('id', brand.id);
}


export async function runFindHandles(
  supabase: SupabaseClient,
  competitor: { id: string; tenant_id: string; website_url: string }
) {
  const handles = await scrapeSocialHandles(competitor.website_url);
  if (handles.length === 0) return;

  const { error } = await supabase.from('competitor_social_handles').upsert(
    handles.map((h) => ({
      competitor_id: competitor.id,
      tenant_id: competitor.tenant_id,
      platform: h.platform,
      handle: h.handle,
      profile_url: h.profile_url,
      verified: h.verified,
      verification_confidence: h.verification_confidence,
      status: 'ready',
    })),
    { onConflict: 'competitor_id,platform,handle' }
  );
  if (error) throw new Error(error.message);
}

export async function runScrapeContent(
  supabase: SupabaseClient,
  competitor: { id: string; tenant_id: string },
  handles: { id: string; platform: string; profile_url: string }[]
) {
  const rows = [];
  for (const handle of handles) {
    const content = await scrapeSocialContent(handle.profile_url, handle.platform);
    for (const item of content) {
      rows.push({
        competitor_id: competitor.id,
        tenant_id: competitor.tenant_id,
        handle_id: handle.id,
        platform: item.platform,
        content_type: item.content_type,
        text: item.text,
        media_urls: item.media_urls,
        posted_at: item.posted_at,
        engagement_metrics: item.engagement_metrics,
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('competitor_content').insert(rows);
    if (error) throw new Error(error.message);
  }

  return rows.length;
}

export async function runGapAnalysis(
  supabase: SupabaseClient,
  reportId: string,
  brand: { context: unknown },
  contentSample: unknown
) {
  const fallback = {
    gaps: [
      'Missing enterprise security proof points',
      'Few customer success stories vs competitors',
    ],
    topics: ['Security', 'Automation', 'Case studies'],
    formats: ['Carousel', 'LinkedIn post', 'Blog'],
  };

  const findings = await chatJson(
    'You are a competitive intelligence analyst. Return JSON only.',
    `Brand context: ${JSON.stringify(brand.context)}
Competitor content sample: ${JSON.stringify(contentSample)}
Return JSON: { "gaps": string[], "topics": string[], "formats": string[] }`,
    fallback
  );

  const { error } = await supabase
    .from('gap_analysis_reports')
    .update({
      status: 'done',
      findings,
      generated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) throw new Error(error.message);
  return findings;
}

export async function runGenerateContent(
  supabase: SupabaseClient,
  input: {
    brand: { id: string; tenant_id: string; context: unknown };
    gap_report_id?: string | null;
    topic: string;
    platform: string;
  }
) {
  const tone = (input.brand.context as { tone_keywords?: string[] })?.tone_keywords || [];
  const fallback = `Here's why ${input.topic} matters for teams that want faster, safer growth.\n\nStart with one proof point. Then show the workflow. End with a clear next step.`;
  const draft_text = await chatText(
    `Write a ${input.platform} post about "${input.topic}". Tone: ${tone.join(', ') || 'professional'}. 120-180 words. No hashtag dump.`,
    fallback
  );

  const generated_image_urls = [
    pollinationsImageUrl(`Professional social graphic about ${input.topic}, clean corporate illustration, no text`),
  ];

  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      brand_id: input.brand.id,
      tenant_id: input.brand.tenant_id,
      gap_report_id: input.gap_report_id || null,
      content_type: 'post',
      platform: input.platform,
      title: input.topic,
      draft_text,
      generated_image_urls,
      opportunity_score: 90,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Weekly automation: refresh posts, analyze, draft — APIs do the work. */
export async function runWeeklyJob(supabase: SupabaseClient) {
  const summary: { brand_id: string; name: string; steps: string[] }[] = [];

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, tenant_id, name, context, status')
    .eq('status', 'ready');

  if (error) throw new Error(error.message);

  for (const brand of brands || []) {
    const steps: string[] = [];
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, tenant_id, website_url, name')
      .eq('brand_id', brand.id)
      .eq('status', 'approved');

    for (const competitor of competitors || []) {
      if (competitor.website_url) {
        await runFindHandles(supabase, {
          id: competitor.id,
          tenant_id: competitor.tenant_id,
          website_url: competitor.website_url,
        });
        steps.push(`handles:${competitor.name}`);
      }

      const { data: handles } = await supabase
        .from('competitor_social_handles')
        .select('id, platform, profile_url')
        .eq('competitor_id', competitor.id)
        .eq('verified', true);

      if (handles && handles.length > 0) {
        const n = await runScrapeContent(supabase, competitor, handles);
        steps.push(`posts:${competitor.name}:${n}`);
      }
    }

    const { data: content } = await supabase
      .from('competitor_content')
      .select('text, platform, content_type')
      .eq('tenant_id', brand.tenant_id)
      .limit(20);

    const { data: report } = await supabase
      .from('gap_analysis_reports')
      .insert({
        tenant_id: brand.tenant_id,
        brand_id: brand.id,
        status: 'running',
      })
      .select()
      .single();

    if (report) {
      const findings = await runGapAnalysis(supabase, report.id, brand, content || []);
      steps.push('gap-analysis');
      const topic = (findings as { topics?: string[] })?.topics?.[0] || 'Weekly competitor insight';
      await runGenerateContent(supabase, {
        brand,
        gap_report_id: report.id,
        topic,
        platform: 'linkedin',
      });
      steps.push(`draft:${topic}`);
    }

    summary.push({ brand_id: brand.id, name: brand.name, steps });
  }

  return summary;
}
