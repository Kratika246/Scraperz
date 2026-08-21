import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function ProductPage() {
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  const brand = brands?.[0];

  if (!brand) {
    redirect('/dashboard/brands/new');
  }

  const context = brand.context as any;

  return (
    <>
      <TopBar
        title="My Product"
        subtitle="Your brand context powers competitor discovery and content generation"
        actions={
          <Link
            href="/dashboard/brands/new"
            className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit brand
          </Link>
        }
      />

      <div className="p-8 space-y-6 stagger-children">
        {/* Brand header card */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {brand.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{brand.name}</h2>
                {brand.website_url && (
                  <a
                    href={brand.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {brand.website_url}
                  </a>
                )}
              </div>
            </div>
            <Badge variant={statusToBadgeVariant(brand.status)} dot>
              {brand.status}
            </Badge>
          </div>

          {brand.raw_description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {brand.raw_description}
              </p>
            </div>
          )}
        </Card>

        {/* Brand context (if scraped) */}
        {context ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {context.tagline && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Tagline</h3>
                </div>
                <p className="text-base text-slate-700 font-medium">{String(context.tagline)}</p>
              </Card>
            )}

            {context.industry && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Industry</h3>
                </div>
                <p className="text-base text-slate-700">{String(context.industry)}</p>
              </Card>
            )}

            {context.target_audience && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-info-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Target Audience</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{String(context.target_audience)}</p>
              </Card>
            )}

            {Array.isArray(context.value_props) && (context.value_props as string[]).length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Value Propositions</h3>
                </div>
                <ul className="space-y-2">
                  {(context.value_props as string[]).map((vp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                      {vp}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {Array.isArray(context.products) && (context.products as string[]).length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Products</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(context.products as string[]).map((p, i) => (
                    <Badge key={i} variant="primary">{p}</Badge>
                  ))}
                </div>
              </Card>
            )}

            {Array.isArray(context.tone_keywords) && (context.tone_keywords as string[]).length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Brand Tone</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(context.tone_keywords as string[]).map((t, i) => (
                    <Badge key={i} variant="default">{t}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : brand.status === 'scraping' ? (
          <Card className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900">Scraping your website…</h3>
              <p className="text-sm text-slate-500">
                We&apos;re analyzing your website to build your brand context. This usually takes 30–60 seconds.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <p className="text-sm text-slate-500">
              Brand context will appear here once your website has been scraped, or you can
              manually add context via the{' '}
              <Link href="/dashboard/brands/new" className="text-primary-600 hover:text-primary-700 font-medium">
                brand setup page
              </Link>
              .
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
