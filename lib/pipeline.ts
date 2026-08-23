import { chatJson, chatText } from '@/lib/llm';
import {
  scrapeBrandBlog,
  scrapeBrandWebsite,
  scrapeCompetitors,
  scrapeSocialContent,
  scrapeSocialHandles,
} from '@/lib/brightdata';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateImage } from '@/lib/image-gen';

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


/** Platforms allowed by the DB check constraint on competitor_social_handles. */
const VALID_PLATFORMS = new Set([
  'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'facebook', 'other',
]);

export async function runFindHandles(
  supabase: SupabaseClient,
  competitor: { id: string; tenant_id: string; website_url: string }
) {
  const handles = await scrapeSocialHandles(competitor.website_url);
  if (handles.length === 0) return;

  // Normalize platforms to the DB-allowed set, filter invalid rows, deduplicate
  const seen = new Set<string>();
  const rows = handles
    .map((h) => ({
      ...h,
      platform: VALID_PLATFORMS.has(h.platform) ? h.platform : 'other',
    }))
    .filter((h) => {
      if (!h.handle || !h.profile_url) return false;
      const key = `${h.platform}::${h.handle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (rows.length === 0) return;

  const { error } = await supabase.from('competitor_social_handles').upsert(
    rows.map((h) => ({
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
    let content: Awaited<ReturnType<typeof scrapeSocialContent>> = [];
    try {
      content = await scrapeSocialContent(handle.profile_url, handle.platform);
    } catch (err) {
      console.warn(
        `Skipping content scrape for ${handle.platform} (${handle.profile_url}):`,
        err instanceof Error ? err.message : err
      );
      continue; // skip this handle, keep processing the rest
    }
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

// lib/pipeline.ts — runScrapeBlog helper for blog post scraping
export async function runScrapeBlog(
  supabase: SupabaseClient,
  competitor: { id: string; tenant_id: string },
  blogUrl: string
) {
  const posts = await scrapeBrandBlog(blogUrl);

  const rows = posts.map((p) => ({
    competitor_id: competitor.id,
    tenant_id: competitor.tenant_id,
    handle_id: null,
    platform: 'blog',
    content_type: 'blog_post',
    title: p.title,
    text: p.text.slice(0, 2000),
    media_urls: [],
    posted_at: p.posted_at,
    engagement_metrics: { likes: 0, comments: 0, shares: 0 },
  }));

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
      'Missing enterprise security proof points and compliance details',
      'Few customer success stories and workflow deep-dives vs competitors',
      'Under-indexing on long-form technical blog articles',
    ],
    topics: [
      'Why AI Guardrails Need Real-Time Verification',
      'Enterprise Workflow Automation Best Practices',
      'Reducing Research Time by 80% with Automated Scrapers',
    ],
    formats: ['Blog article', 'LinkedIn post', 'Twitter/X thread', 'Instagram carousel'],
    competitor_insights:
      'Competitors focus heavily on generic growth tips, leaving an open opportunity for technical depth and enterprise-grade security messaging.',
  };

  const prompt = `You are a strategic competitive intelligence analyst.
Analyze the provided competitor content sample against our brand context.

Brand Context:
${JSON.stringify(brand.context, null, 2)}

Competitor Content Sample:
${JSON.stringify(contentSample, null, 2)}

Identify content gaps, recommended topic ideas (for both blog articles and social posts), and content format recommendations.

Return valid JSON with:
{
  "gaps": string[],
  "topics": string[],
  "formats": string[],
  "competitor_insights": string
}`;

  const findings = await chatJson(
    'You are a competitive intelligence analyst. Return JSON only.',
    prompt,
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
    platform: string; // 'blog' | 'linkedin' | 'twitter' | 'instagram' | 'facebook'
    content_type?: string; // 'article' | 'post'
  }
) {
  const tone = (input.brand.context as { tone_keywords?: string[] })?.tone_keywords || [];
  const targetAudience = (input.brand.context as { target_audience?: string })?.target_audience || 'professionals';
  const isBlog = input.platform.toLowerCase() === 'blog' || input.content_type === 'article';

  const contentType = isBlog ? 'article' : 'post';
  const platform = isBlog ? 'blog' : input.platform.toLowerCase();

  let userPrompt = '';
  let fallbackText = '';

  if (isBlog) {
    userPrompt = `Write an in-depth, highly comprehensive, SEO-optimized blog article about "${input.topic}".
Target Audience: ${targetAudience}
Tone: ${tone.join(', ') || 'professional, authoritative, and practical'}
Brand Context: ${JSON.stringify(input.brand.context)}

Structure & Content Requirements:
- Title heading (# Title)
- Executive Summary (3-4 detailed sentences outlining the core thesis and strategic value)
- 4 detailed, multi-paragraph core sections with subheadings (## 1. Section Title, ## 2. Section Title, ## 3. Section Title, ## 4. Section Title)
- Under each section, write 2 to 3 thorough paragraphs explaining the concept, real-world context, technical considerations, and step-by-step implementation.
- Include a practical bulleted list of Key Takeaways.
- Conclude with an Actionable Summary and Call to Action (CTA).

Length: 700 to 1100 words. Write full, detailed paragraphs. Do NOT write a brief summary or placeholder outline. Format cleanly in Markdown.`;

    fallbackText = `# ${input.topic}

## Executive Summary
In today's fast-evolving landscape, engineering and product teams face unprecedented friction from context-switching and fragmented toolchains. Modern teams that prioritize workflow speed and intuitive UI design drastically reduce cognitive load, enabling engineers to maintain flow state and deliver high-impact features faster. This guide explores how streamlined interfaces drive measurable productivity gains.

## 1. The Real Cost of Context-Switching in Modern Development
Context-switching is one of the most silent productivity killers in software development. Every time an engineer jumps between issue trackers, design specs, code repositories, and communication channels, their cognitive momentum resets.

Research shows it takes up to 23 minutes to regain full focus after a disruption. When user interfaces are sluggish or require multi-step navigation, micro-interruptions stack up throughout the day, leading to developer burnout and lower code output.

## 2. Architectural Principles of High-Speed Interfaces
High-performance interfaces do not happen by accident; they are engineered with speed as a core feature. Key architectural strategies include:

- **Optimistic UI Updates**: Immediately reflecting user actions in the frontend state while background synchronization completes asynchronously.
- **Keyboard-First Navigation**: Providing comprehensive command palettes and hotkeys to eliminate mouse travel time.
- **Local-First Data Syncing**: Storing application state locally to ensure sub-100ms response times regardless of network latency.

## 3. Designing for Cognitive Flow and Developer Ergonomics
Ergonomics in software goes beyond visual aesthetics. It is about minimizing friction between intent and execution. When developer tools respond instantaneously, engineers feel empowered to iterate without distraction.

By organizing information hierarchically and eliminating unnecessary modal dialogs, teams can execute complex operations in a single keypress.

## 4. Measuring Impact: Velocity, Developer Satisfaction, and Retention
Investing in UI performance yields direct returns across key engineering metrics:
1. **Accelerated Pull Request Cycles**: Shorter turnaround times from issue assignment to code review.
2. **Improved Onboarding**: Intuitive workflows allow new hires to become productive within days.
3. **Higher Retention**: Developers who spend less time fighting sluggish tools report significantly higher job satisfaction.

## Key Takeaways
- UI speed directly impacts developer focus and cognitive flow.
- Optimistic updates and keyboard shortcuts eliminate daily micro-friction.
- Tooling ergonomics drive long-term engineering velocity and team satisfaction.

## Next Steps
Audit your internal tools and developer workflows today to identify speed bottlenecks and elevate team performance.`;
  } else {
    userPrompt = `Write an engaging ${platform} post about "${input.topic}".
Target Audience: ${targetAudience}
Tone: ${tone.join(', ') || 'professional'}
Brand Context: ${JSON.stringify(input.brand.context)}

Requirements for ${platform}:
- ${platform === 'twitter' ? 'Concise post under 280 characters with strong hook and clear message.' : platform === 'instagram' ? 'Visual caption with strong hook, engaging body, clear CTA, and 3-5 relevant hashtags.' : 'Strong hook line, clear value points with spacing/bullets, and call to action. 120-200 words.'}
- Professional formatting, no generic fluff.`;

    fallbackText = `Here's why ${input.topic} matters for ${targetAudience}.\n\n1. Identify the core challenge.\n2. Leverage automated insights.\n3. Execute with precision.\n\nWhat's your strategy? Let us know below.`;
  }

  let draft_text = await chatText(userPrompt, fallbackText);

  let title = input.topic;
  if (isBlog) {
    const titleMatch = draft_text.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
      // Remove the top H1 title line from draft_text so it isn't duplicated in the UI
      draft_text = draft_text.replace(/^#\s+.+\n+/, '').trim();
    }
  }

  const imagePrompt = isBlog
    ? `Professional blog header illustration about ${input.topic}, sleek modern tech design, clean corporate graphics`
    : `Professional social media graphic about ${input.topic}, modern corporate design, clean graphics`;

  // Generate a real image (Gemini → FLUX → AI Horde). Empty array if all fail.
  let generated_image_urls: string[] = [];
  const imgResult = await generateImage(imagePrompt);
  if (imgResult?.dataUri) {
    generated_image_urls = [imgResult.dataUri];
  }

  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      brand_id: input.brand.id,
      tenant_id: input.brand.tenant_id,
      gap_report_id: input.gap_report_id || null,
      content_type: contentType,
      platform: platform,
      title: title,
      draft_text,
      generated_image_urls,
      opportunity_score: 95,
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

        try {
          const blogUrl = competitor.website_url.replace(/\/+$/, '') + '/blog';
          const nb = await runScrapeBlog(supabase, competitor, blogUrl);
          steps.push(`blog:${competitor.name}:${nb}`);
        } catch {
          /* ignore blog errors during automated weekly run */
        }
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
