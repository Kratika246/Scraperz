import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import TopBar from '@/components/dashboard/TopBar';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, status');

  const brand = brands?.[0];
  const approvedCount = competitors?.filter((c) => c.status === 'approved').length ?? 0;
  const totalCompetitors = competitors?.length ?? 0;

  return (
    <>
      <TopBar
        title="Overview"
        subtitle="Your competitive intelligence dashboard"
      />

      <div className="p-8 space-y-6 stagger-children">
        {!brand ? (
          /* No brand yet — onboarding CTA */
          <Card className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Set up your brand
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Add your brand to get started. We&apos;ll scrape your website and build
              a context profile to power competitor discovery and content
              generation.
            </p>
            <Link
              href="/dashboard/brands/new"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add your brand
            </Link>
          </Card>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hover>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Brand Status</span>
                  <Badge variant={statusToBadgeVariant(brand.status)} dot>
                    {brand.status}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900">{brand.name}</p>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {brand.website_url || 'No website'}
                </p>
              </Card>

              <Card hover>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Competitors</span>
                  <div className="w-8 h-8 rounded-lg bg-info-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-info-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalCompetitors}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {approvedCount} approved
                </p>
              </Card>

              <Card hover>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Content Scraped</span>
                  <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">—</p>
                <p className="text-xs text-slate-400 mt-1">Posts & articles</p>
              </Card>

              <Card hover>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-500">Opportunities</span>
                  <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">—</p>
                <p className="text-xs text-slate-400 mt-1">Content gaps found</p>
              </Card>
            </div>

            {/* Quick actions */}
            <Card>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/dashboard/competitors"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-info-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5 text-info-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Discover competitors</p>
                    <p className="text-xs text-slate-500">Find who you&apos;re competing with</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/intelligence"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">View intelligence</p>
                    <p className="text-xs text-slate-500">See what competitors post</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/approvals"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4.5 h-4.5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Review drafts</p>
                    <p className="text-xs text-slate-500">Approve content for publishing</p>
                  </div>
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
