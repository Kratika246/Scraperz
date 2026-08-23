'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

export default function IntelligencePage() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/intelligence');
        const data = await res.json();
        setContent(data.content || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading intelligence feed...</div>;
  }

  return (
    <>
      <TopBar
        title="Intelligence"
        subtitle="Recent posts & blog articles scraped from competitors"
      />

      <div className="p-8">
        {content.length === 0 ? (
          <EmptyState
            title="No intelligence data yet"
            description="On Competitors, approve a rival, then use Find handles, Scrape posts, or Scrape blog."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {content.map((item) => (
              <Card key={item.id}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={item.platform === 'blog' ? 'success' : 'info'}>
                    {item.platform}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {item.posted_at ? new Date(item.posted_at).toLocaleString() : ''}
                  </span>
                </div>
                {item.title && (
                  <h4 className="text-base font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h4>
                )}
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {item.text}
                </p>
                {item.engagement_metrics && item.platform !== 'blog' && (
                  <p className="text-xs text-slate-500 mt-3">
                    {item.engagement_metrics.likes || 0} likes · {item.engagement_metrics.comments || 0} comments
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
