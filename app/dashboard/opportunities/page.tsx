'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);

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

  async function handleGenerate(topic: string, platform: 'linkedin' | 'blog', gapReportId?: string) {
    if (!brandId) return;
    setGeneratingTopic(`${topic}-${platform}`);
    try {
      const res = await fetch(`/api/brands/${brandId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platform,
          content_type: platform === 'blog' ? 'article' : 'post',
          gap_report_id: gapReportId,
        }),
      });
      if (res.ok) {
        router.push('/dashboard/content');
      } else {
        alert('Failed to generate draft');
      }
    } catch {
      alert('Error generating draft');
    } finally {
      setGeneratingTopic(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading opportunities...</div>;
  }

  return (
    <>
      <TopBar
        title="Opportunities & Gap Analysis"
        subtitle="AI-driven competitive gap insights, topic strategy, and content recommendations"
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
            description="Scrape competitor posts & blogs first, then click Run Analysis."
          />
        ) : (
          <div className="space-y-6 max-w-5xl">
            {reports.map((report) => (
              <Card key={report.id}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {report.generated_at
                        ? `Competitive Analysis — ${new Date(report.generated_at).toLocaleString()}`
                        : 'Analysis running…'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Report ID: {report.id}
                    </p>
                  </div>
                  <Badge variant={report.status === 'done' ? 'success' : 'warning'}>
                    {report.status}
                  </Badge>
                </div>

                {report.findings?.competitor_insights && (
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Competitor Strategy Insights
                    </h4>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {report.findings.competitor_insights}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span>Uncovered Content Gaps</span>
                    </h4>
                    <ul className="space-y-2">
                      {report.findings?.gaps?.map((gap: string, i: number) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-warning-50/50 border border-warning-100 p-2.5 rounded-lg">
                          <span className="text-warning-600 font-bold">•</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Recommended Formats</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {report.findings?.formats?.map((fmt: string, i: number) => (
                        <Badge key={i} variant="info">
                          {fmt}
                        </Badge>
                      ))}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 mb-3">High-Impact Topics</h4>
                    <div className="space-y-3">
                      {report.findings?.topics?.map((topic: string, i: number) => (
                        <div key={i} className="p-3 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:border-slate-300 transition-all">
                          <span className="text-sm font-medium text-slate-800 flex-1">{topic}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs py-1 px-2.5"
                              loading={generatingTopic === `${topic}-linkedin`}
                              onClick={() => handleGenerate(topic, 'linkedin', report.id)}
                            >
                              + Post
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs py-1 px-2.5"
                              loading={generatingTopic === `${topic}-blog`}
                              onClick={() => handleGenerate(topic, 'blog', report.id)}
                            >
                              + Blog
                            </Button>
                          </div>
                        </div>
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
