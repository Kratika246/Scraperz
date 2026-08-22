'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function OpportunitiesPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const bRes = await fetch('/api/brands');
        const bData = await bRes.json();
        if (bData.brands && bData.brands.length > 0) {
            setBrandId(bData.brands[0].id);
            // Assuming there's a GET route for reports, or just showing empty state for demo
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleAnalyze() {
    if (!brandId) return;
    setIsAnalyzing(true);
    setLoadingMessage('Fetching competitor content...');
    
    const intervals = [
      setTimeout(() => setLoadingMessage('Synthesizing brand context...'), 1500),
      setTimeout(() => setLoadingMessage('Running AI gap analysis...'), 3000),
      setTimeout(() => setLoadingMessage('Structuring insights...'), 5000),
    ];

    try {
      const res = await fetch(`/api/brands/${brandId}/analyze-gaps`, { method: 'POST' });
      const data = await res.json();
      if (data.report) {
         setReports([data.report, ...reports]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      intervals.forEach(clearTimeout);
      setIsAnalyzing(false);
      setLoadingMessage('');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading opportunities...</div>;
  }

  return (
    <>
      <TopBar
        title="Opportunities"
        subtitle="Content gaps and strategic insights based on competitor analysis"
        actions={
            <div className="flex items-center gap-4">
              {loadingMessage && (
                <span className="text-sm text-primary-600 animate-pulse font-medium">
                  {loadingMessage}
                </span>
              )}
              <Button onClick={handleAnalyze} loading={isAnalyzing} disabled={!brandId || isAnalyzing}>
                Run Analysis
              </Button>
            </div>
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
            {reports.map((report) => (
               <Card key={report.id}>
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold">Analysis from {new Date(report.generated_at).toLocaleDateString()}</h3>
                    <Badge variant="success">Completed</Badge>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Content Gaps</h4>
                        <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                            {report.findings?.gaps?.map((gap: string, i: number) => <li key={i}>{gap}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Recommended Topics</h4>
                        <div className="flex flex-wrap gap-2">
                            {report.findings?.topics?.map((topic: string, i: number) => (
                                <Badge key={i} variant="default">{topic}</Badge>
                            ))}
                        </div>
                    </div>
                 </div>
               </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
