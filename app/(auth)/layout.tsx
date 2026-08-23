import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-100 items-center justify-center">
        {/* Large decorative circles like in the reference image */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary-200/60" />
        <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full bg-primary-300/40" />
        <div className="absolute bottom-10 -right-10 w-72 h-72 rounded-full bg-primary-200/50" />
        <div className="absolute bottom-1/3 left-1/4 w-32 h-32 rounded-full bg-primary-100/70" />

        {/* Brand + copy */}
        <div className="relative z-10 px-16 max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <svg className="w-5 h-5 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-sm font-bold tracking-widest text-slate-700 uppercase">Compete</span>
          </Link>

          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight mb-4">
            Analyze. Plan.<br />Outperform.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            AI-powered competitive intelligence that discovers, analyzes, and
            helps you outperform your market rivals.
          </p>

          <div className="space-y-3">
            {[
              'Automatic competitor discovery',
              'Social media content analysis',
              'AI-generated content to close gaps',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-slate-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-100">
        {/* Mobile logo */}
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <svg className="w-5 h-5 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="text-sm font-bold tracking-widest text-slate-700 uppercase">Compete</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-100 p-8 animate-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

