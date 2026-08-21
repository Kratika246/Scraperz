'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

      router.push(`/brands/${data.brand.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <h1 className="text-2xl font-semibold mb-1">Add your brand</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Give us your website (preferred) or a description. We&apos;ll scrape and
        summarize your brand context before finding competitors.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
            placeholder="https://acme.com"
          />
        </div>

        <div className="text-center text-xs text-neutral-400">— or —</div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Describe your product / brand
          </label>
          <textarea
            value={rawDescription}
            onChange={(e) => setRawDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2"
            placeholder="We sell..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}