'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';

export default function NewBrandPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website_url: websiteUrl || undefined,
          raw_description: rawDescription || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      router.push('/dashboard/product');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopBar
        title="Add your brand"
        subtitle="Give us your website or a description to build your brand context"
      />

      <div className="p-8 max-w-xl animate-fade-in">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="brand-name" className="block text-sm font-medium text-slate-700">
                Brand name <span className="text-danger-500">*</span>
              </label>
              <input
                id="brand-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150"
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="brand-website" className="block text-sm font-medium text-slate-700">
                Website URL
              </label>
              <input
                id="brand-website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150"
                placeholder="https://acme.com"
              />
              <p className="text-xs text-slate-400">
                We&apos;ll scrape this and extract your brand context automatically
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or describe your brand</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="brand-description" className="block text-sm font-medium text-slate-700">
                Product / brand description
              </label>
              <textarea
                id="brand-description"
                value={rawDescription}
                onChange={(e) => setRawDescription(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150 resize-none"
                placeholder="We build AI-powered tools for marketing teams that help them analyze competitor content and generate on-brand social media posts…"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 border border-danger-500/20 px-4 py-3">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 text-white py-2.5 text-sm font-medium hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Setting up brand…
                </span>
              ) : (
                'Continue →'
              )}
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}