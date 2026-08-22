import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configuredCollectors } from '@/lib/brightdata';

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY;
  const bdKey = process.env.BRIGHTDATA_API_KEY;

  let supabaseOk = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('brands').select('id').limit(1);
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }

  let n8nOk = false;
  const n8nBase = process.env.N8N_BASE_URL || 'http://localhost:5678';
  try {
    const res = await fetch(n8nBase, { method: 'GET' });
    n8nOk = res.ok || res.status === 401 || res.status === 200;
  } catch {
    n8nOk = false;
  }

  return NextResponse.json({
    ok: supabaseOk,
    services: {
      supabase: supabaseOk,
      groq: Boolean(groqKey && groqKey.length > 8),
      brightdata: Boolean(bdKey && bdKey.length > 8),
      scraper_studio_collectors: configuredCollectors(),
      n8n_scheduler: n8nOk,
    },
    model: {
      ui: 'Manual buttons call Next.js APIs only',
      apis: 'Bright Data Scraper Studio collectors + Groq + Supabase writes',
      n8n: 'Weekly cron POST /api/jobs/weekly (does not scrape itself)',
    },
    apis: [
      'POST /api/brands — Scraper Studio brand-website collector + Groq',
      'POST /api/brands/:id/discover-competitors — Scraper Studio competitors collector',
      'POST /api/competitors/:id/find-handles — Scraper Studio social-handles collector',
      'POST /api/competitors/:id/scrape-content — Scraper Studio social-content collector',
      'POST /api/brands/:id/analyze-gaps — Groq',
      'POST /api/brands/:id/generate-content — Groq + Pollinations',
      'POST /api/publish — Buffer or queued job',
      'POST /api/jobs/weekly — n8n-only trigger; same pipeline as the UI APIs',
    ],
  });
}
