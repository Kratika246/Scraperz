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
      // In a real app, this would fetch from an API route that queries `competitor_content`.
      // For the hackathon, we'll simulate fetching all content for the tenant.
      setLoading(false);
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
        subtitle="Recent posts and articles from your competitors"
      />

      <div className="p-8">
        {content.length === 0 ? (
          <EmptyState
            title="No intelligence data yet"
            description="Content will appear here once you've discovered competitors and their social handles have been scraped."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* Feed items will go here */}
          </div>
        )}
      </div>
    </>
  );
}
