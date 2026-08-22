'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function OpportunitiesPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadReports = useCallback(async () => {
    const res = await fetch('/api/gap-analysis');
    const data = await res.json();
    setReports(data.reports || []);
    const running = (data.reports || []).some((r: { status: string }) => r.status === 'running');
    if (!running) {
      setIsAnalyzing(false);
      setLoadingMessage('');
    }
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        const bRes = await fetch('/api/brands');
        const bData = await bRes.json();
        if (bData.brands?.[0]) setBrandId(bData.brands[0].id);
        await loadReports();
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [loadReports]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setInterval(loadReports, 2500);
    return () => clearInterval(timer);
  }, [isAnalyzing, loadReports]);

  async function handleAnalyze() {
    if (!brandId) return;
    setIsAnalyzing(true);
    setLoadingMessage('API + Groq analyzing competitor content…');
    await fetch(`/api/brands/${brandId}/analyze-gaps`, { method: 'POST' });
    await loadReports();
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading opportunities...</div>;
  }

  return (
    <>
      <TopBar
        title="Opportunities"
        subtitle="Content gaps from competitor posts, written by Groq"
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
            description="Scrape competitor posts first, then run analysis."
          />
        ) : (
          <div className="space-y-6 max-w-4xl">
            {reports.map((report) => (
              <Card key={report.id}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">
                    {report.generated_at
                      ? `Analysis from ${new Date(report.generated_at).toLocaleString()}`
                      : 'Analysis running…'}
                  </h3>
                  <Badge variant={report.status === 'done' ? 'success' : 'warning'}>
                    {report.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Content Gaps</h4>
                    <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                      {report.findings?.gaps?.map((gap: string, i: number) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Recommended Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {report.findings?.topics?.map((topic: string, i: number) => (
                        <Badge key={i} variant="default">
                          {topic}
                        </Badge>
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
