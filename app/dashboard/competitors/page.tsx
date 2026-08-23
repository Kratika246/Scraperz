'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

export default function CompetitorsPage() {
  const [brand, setBrand] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'discovered' | 'approved' | 'rejected'>('all');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadData = useCallback(async () => {
    const bRes = await fetch('/api/brands');
    const bData = await bRes.json();
    const currentBrand = bData.brands?.[0];
    setBrand(currentBrand);

    if (currentBrand) {
      const cRes = await fetch(`/api/brands/${currentBrand.id}/competitors`);
      const cData = await cRes.json();
      setCompetitors(cData.competitors || []);
      if (currentBrand.competitor_discovery_status === 'done') {
        setIsDiscovering(false);
        setLoadingMessage('');
      }
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    if (!isDiscovering) return;
    const timer = setInterval(loadData, 2500);
    return () => clearInterval(timer);
  }, [isDiscovering, loadData]);

  async function handleDiscover() {
    if (!brand) return;
    setIsDiscovering(true);
    setLoadingMessage('Scraper Studio SERP collector discovering competitors…');
    await fetch(`/api/brands/${brand.id}/discover-competitors`, { method: 'POST' });
    await loadData();
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setCompetitors((comps) => comps.map((c) => (c.id === id ? { ...c, status } : c)));
    await fetch(`/api/competitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function findHandles(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/competitors/${id}/find-handles`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Find handles failed');
    }
    await loadData();
    setBusyId(null);
  }

  async function scrapeContent(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/competitors/${id}/scrape-content`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Scrape failed — find handles first');
    setBusyId(null);
  }

  async function scrapeBlog(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/competitors/${id}/scrape-blog`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Blog scrape failed');
    } else {
      alert(`Scraped ${data.scraped_count || 0} blog post(s) from ${data.blog_url}`);
    }
    setBusyId(null);
  }

  const filteredCompetitors = competitors.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading competitors...</div>;
  }

  return (
    <>
      <TopBar
        title="Competitors"
        subtitle="Review competitors, then pull handles, posts, and blogs via Bright Data"
        actions={
          brand && (
            <div className="flex items-center gap-4">
              {loadingMessage && (
                <span className="text-sm text-primary-600 animate-pulse font-medium">
                  {loadingMessage}
                </span>
              )}
              <Button
                onClick={handleDiscover}
                loading={isDiscovering}
                disabled={!brand.context || isDiscovering}
              >
                Discover competitors
              </Button>
            </div>
          )
        }
      />

      <div className="p-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Self-Healing Scraper Engine Active</span>
                <span className="text-[10px] bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide font-mono">
                  Into the Scrape-Verse
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Resilient multi-tier fallback active (SERP API → Scraper Studio → DOM Aria → Regex Scan → AI Structural Repair). Automatically adapts when web layouts change.
              </p>
            </div>
          </div>
          <a
            href="/api/self-healing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0"
          >
            View Telemetry API
          </a>
        </div>

        {!brand?.context && (
          <div className="bg-warning-50 border border-warning-200 text-warning-800 p-4 rounded-lg">
            Brand context missing. Finish website scrape on My Product first.
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {(['all', 'discovered', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                filter === f
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filteredCompetitors.length === 0 ? (
          <EmptyState
            title="No competitors found"
            description="Click Discover competitors to run the Scraper Studio collector through the API."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompetitors.map((competitor) => (
              <Card key={competitor.id} className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{competitor.name}</h3>
                    {competitor.website_url && (
                      <p className="text-sm text-primary-600 break-all">{competitor.website_url}</p>
                    )}
                  </div>
                  <Badge variant={statusToBadgeVariant(competitor.status)}>{competitor.status}</Badge>
                </div>

                {competitor.confidence_score && (
                  <div className="pt-2 flex items-center justify-between text-sm text-slate-500">
                    <span>Relevance</span>
                    <span className="font-medium text-slate-700">
                      {Math.round(competitor.confidence_score * 100)}%
                    </span>
                  </div>
                )}

                {competitor.competitor_social_handles && competitor.competitor_social_handles.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Social Channels</span>
                    <div className="flex flex-wrap gap-1.5">
                      {competitor.competitor_social_handles.map((h: any) => (
                        <a
                          key={h.id}
                          href={h.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition"
                        >
                          <span className="text-slate-400 capitalize mr-1">{h.platform}:</span>
                          <span>@{h.handle}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                  <Button
                    variant={competitor.status === 'approved' ? 'primary' : 'secondary'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateStatus(competitor.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={competitor.status === 'rejected' ? 'danger' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateStatus(competitor.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    loading={busyId === competitor.id}
                    onClick={() => findHandles(competitor.id)}
                  >
                    Find handles
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    loading={busyId === competitor.id}
                    onClick={() => scrapeContent(competitor.id)}
                  >
                    Scrape posts
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    loading={busyId === competitor.id}
                    onClick={() => scrapeBlog(competitor.id)}
                  >
                    Scrape blog
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
