'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function ContentPage() {
  const [content, setContent] = useState<any[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<'linkedin' | 'blog' | 'twitter' | 'instagram'>('blog');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [readingItem, setReadingItem] = useState<any | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/generated-content');
    const data = await res.json();
    setContent(data.content || []);
  }, []);

  useEffect(() => {
    async function boot() {
      const bRes = await fetch('/api/brands');
      const bData = await bRes.json();
      setBrandId(bData.brands?.[0]?.id || null);
      const gRes = await fetch('/api/gap-analysis');
      const gData = await gRes.json();
      const topics = gData.reports?.[0]?.findings?.topics || [];
      setRecommendedTopics(topics);
      if (topics[0]) setTopic(topics[0]);
      await load();
      setLoading(false);
    }
    boot();
  }, [load]);

  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [generating, load]);

  async function generate() {
    if (!brandId) return;
    setGenerating(true);
    await fetch(`/api/brands/${brandId}/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic || 'Enterprise workflow automation',
        platform: platform,
        content_type: platform === 'blog' ? 'article' : 'post',
      }),
    });
    await load();
    setTimeout(() => setGenerating(false), 5000);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading content library...</div>;
  }

  return (
    <>
      <TopBar
        title="Content Library"
        subtitle="AI-generated in-depth blog articles and social media drafts"
      />

      <div className="p-8 space-y-8">
        <Card className="p-6 bg-slate-900 text-white border-slate-800">
          <h2 className="text-lg font-bold mb-1">Generate In-Depth Content</h2>
          <p className="text-xs text-slate-400 mb-4">
            Create multi-paragraph blog articles or platform-tailored social media drafts using competitive gap intelligence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Topic / Headline
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic or select recommended..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Format / Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="blog">Blog Article (Long-form)</option>
                <option value="linkedin">LinkedIn Post</option>
                <option value="twitter">Twitter / X Post</option>
                <option value="instagram">Instagram Post</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <Button
                onClick={generate}
                loading={generating}
                disabled={!brandId || !topic}
                className="w-full py-2"
              >
                Generate Content
              </Button>
            </div>
          </div>

          {recommendedTopics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400 mr-2">Recommended from Gap Analysis:</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1">
                {recommendedTopics.slice(0, 5).map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTopic(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      topic === t
                        ? 'bg-primary-600 text-white border-primary-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {content.length === 0 ? (
          <EmptyState
            title="No content generated yet"
            description="Use the generator above or run gap analysis to create blog articles and posts."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => {
              const isBlog = item.platform === 'blog' || item.content_type === 'article';

              return (
                <Card key={item.id} className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={isBlog ? 'success' : 'info'}>
                          {isBlog ? 'Blog Article' : item.platform}
                        </Badge>
                        <Badge variant={statusToBadgeVariant(item.status)}>{item.status}</Badge>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-line leading-relaxed">
                      {item.draft_text?.replace(/^#\s+.+\n+/, '')}
                    </p>

                    <button
                      onClick={() => setReadingItem(item)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline mt-3 inline-flex items-center gap-1"
                    >
                      <span>Read full {isBlog ? 'article' : 'post'} →</span>
                    </button>

                    {item.generated_image_urls?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.generated_image_urls[0]}
                        alt=""
                        className="mt-4 rounded-xl border border-slate-200 w-full object-cover max-h-40"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Content Reader Modal */}
      {readingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Badge variant={readingItem.platform === 'blog' ? 'success' : 'info'}>
                  {readingItem.platform === 'blog' ? 'Blog Article' : readingItem.platform}
                </Badge>
                <Badge variant={statusToBadgeVariant(readingItem.status)}>
                  {readingItem.status}
                </Badge>
              </div>
              <button
                onClick={() => setReadingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                {readingItem.title}
              </h2>

              {readingItem.generated_image_urls?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={readingItem.generated_image_urls[0]}
                  alt=""
                  className="rounded-xl border border-slate-200 w-full max-h-72 object-cover"
                />
              )}

              <div className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap font-sans space-y-4">
                {readingItem.draft_text}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={() => setReadingItem(null)}>
                Close Reader
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
