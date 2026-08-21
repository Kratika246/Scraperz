export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand decoration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sidebar-bg via-[#1e2d42] to-[#0f1923] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-primary-400/5 blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-2.5 mb-8">
            <svg className="w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth={1.5} fill="none" />
            </svg>
            <span className="text-2xl font-bold text-white tracking-wide">COMPETE</span>
          </div>
          
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Know what your competitors<br />
            are doing. Do it better.
          </h2>
          <p className="text-lg text-slate-400 max-w-md">
            AI-powered competitive intelligence that discovers, analyzes, and 
            helps you outperform your market rivals.
          </p>

          <div className="mt-12 space-y-4">
            {[
              'Automatic competitor discovery',
              'Social media content analysis',
              'AI-generated content to close gaps',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
