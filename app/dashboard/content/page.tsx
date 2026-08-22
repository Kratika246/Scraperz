'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function ContentPage() {
  const [content, setContent] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      const firstTopic = gData.reports?.[0]?.findings?.topics?.[0];
      if (firstTopic) setTopic(firstTopic);
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
      body: JSON.stringify({ topic: topic || 'Enterprise workflow security', platform: 'linkedin' }),
    });
    await load();
    setTimeout(() => setGenerating(false), 8000);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading content...</div>;
  }

  return (
    <>
      <TopBar
        title="Content Library"
        subtitle="Groq drafts + Pollinations images, stored in Supabase"
        actions={
          <div className="flex items-center gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button onClick={generate} loading={generating} disabled={!brandId}>
              Generate New
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {content.length === 0 ? (
          <EmptyState
            title="No content generated yet"
            description="Run gap analysis, then generate a post from a recommended topic."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <Badge variant={statusToBadgeVariant(item.status)}>{item.status}</Badge>
                </div>
                <p className="text-sm text-slate-600 line-clamp-5 whitespace-pre-wrap">{item.draft_text}</p>
                {item.generated_image_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.generated_image_urls[0]}
                    alt=""
                    className="mt-4 rounded-lg border border-slate-200 w-full"
                  />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
