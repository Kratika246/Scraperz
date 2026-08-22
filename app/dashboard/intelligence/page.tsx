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
        subtitle="Recent posts scraped from competitor handles"
      />

      <div className="p-8">
        {content.length === 0 ? (
          <EmptyState
            title="No intelligence data yet"
            description="On Competitors, approve a rival, then use Find handles and Scrape posts."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {content.map((item) => (
              <Card key={item.id}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="info">{item.platform}</Badge>
                  <span className="text-xs text-slate-400">
                    {item.posted_at ? new Date(item.posted_at).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{item.text}</p>
                {item.engagement_metrics && (
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
