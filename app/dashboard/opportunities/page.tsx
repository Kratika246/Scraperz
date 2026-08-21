'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function OpportunitiesPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // In a real app, this would fetch from an API route that queries `gap_analysis_reports`.
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading opportunities...</div>;
  }

  return (
    <>
      <TopBar
        title="Opportunities"
        subtitle="Content gaps and strategic insights based on competitor analysis"
        actions={
            <Button>Run Analysis</Button>
        }
      />

      <div className="p-8">
        {reports.length === 0 ? (
          <EmptyState
            title="No gap analysis reports yet"
            description="Run an analysis to discover content opportunities your competitors are missing."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* Report cards will go here */}
          </div>
        )}
      </div>
    </>
  );
}
