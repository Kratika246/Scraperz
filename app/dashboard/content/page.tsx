'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function ContentPage() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // Fetch from API in real app
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading content...</div>;
  }

  return (
    <>
      <TopBar
        title="Content Library"
        subtitle="View and manage AI-generated content"
        actions={
            <Button>Generate New</Button>
        }
      />

      <div className="p-8">
        {content.length === 0 ? (
          <EmptyState
            title="No content generated yet"
            description="Use gap analysis opportunities to generate on-brand content, including images and text."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Content cards will go here */}
          </div>
        )}
      </div>
    </>
  );
}
