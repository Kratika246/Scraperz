import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto border-b border-slate-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-base font-bold tracking-widest text-slate-900 uppercase">Compete</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#blog" className="hover:text-slate-900 transition-colors">Blog</a>
          <a href="#contact" className="hover:text-slate-900 transition-colors">Contact</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white px-5 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left copy */}
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary-600 mb-6 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-dot" />
            AI-Powered Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.15] mb-6 text-slate-900">
            Know what your<br />
            <span className="text-primary-600">competitors</span><br />
            are doing before<br />
            they do it
          </h1>

          <p className="text-slate-500 text-base leading-relaxed max-w-md mb-8">
            Compete scrapes your competitors&apos; social media, blogs, and web presence,
            identifies content gaps, and generates on-brand posts — all while you focus
            on what matters.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              id="hero-cta-signup"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-7 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Start for free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              id="hero-cta-demo"
              className="inline-flex items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900 px-7 py-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              View demo
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-400">No credit card required · Free 14-day trial</p>
        </div>

        {/* Right: dashboard mockup */}
        <div className="relative hidden lg:block animate-slide-right">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-slate-100 rounded-3xl -rotate-2 scale-105" />
          <div className="relative bg-white rounded-2xl shadow-card-hover border border-slate-100 p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold text-slate-700">Market Overview</span>
              <span className="text-xs bg-success-50 text-success-600 font-medium px-2.5 py-0.5 rounded-full border border-success-500/20">● Live</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Competitors', value: '12' },
                { label: 'Opportunities', value: '18' },
                { label: 'Drafts Ready', value: '5' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
            {/* bar chart */}
            <div className="flex items-end gap-1 h-24 bg-slate-50 rounded-xl p-3">
              {[35, 55, 40, 70, 50, 65, 80, 55, 72, 90, 68].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background: i === 10 ? '#2563eb' : i === 9 ? '#93c5fd' : '#bfdbfe',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-xs text-slate-400">Jan</span>
              <span className="text-xs font-medium text-primary-600">Now ↑ 23%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-slate-50 py-20 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-3">
            Everything you need to stay ahead
          </h2>
          <p className="text-center text-slate-500 text-sm mb-12 max-w-md mx-auto">
            One platform to monitor, analyze, and outperform every competitor in your market.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger-children">
            {[
              {
                title: 'Competitor Tracking',
                desc: 'Automatically discover and track competitors across social media, blogs, and the web — updated daily.',
                detail: 'Updated daily',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                ),
              },
              {
                title: 'Opportunity Scoring',
                desc: 'See ranked content gaps with engagement data — know exactly where to focus to win market share.',
                detail: 'AI-ranked gaps',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                title: 'Marketing Drafts',
                desc: 'Generate on-brand, SEO-optimised drafts ready to publish. Review, approve, and go live instantly.',
                detail: 'One-click publish',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-card-hover transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 mb-4 group-hover:bg-primary-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">{f.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark CTA ── */}
      <section className="bg-sidebar-bg py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-primary-600/10 blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary-400/5 blur-[60px]" />
        <div className="relative z-10 max-w-2xl mx-auto px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Stop guessing what competitors<br />will do next
          </h2>
          <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto">
            Join teams that stay one step ahead because they use data, not guesses.
            Get started free today.
          </p>
          <Link
            href="/signup"
            id="cta-section-signup"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-3.5 rounded-lg text-sm font-semibold transition-colors shadow-lg"
          >
            Start free trial
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-sidebar-bg border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Compete</span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Compete. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
