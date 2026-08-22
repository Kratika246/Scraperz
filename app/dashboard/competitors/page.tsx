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
    await fetch(`/api/competitors/${id}/find-handles`, { method: 'POST' });
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
        subtitle="Review competitors, then pull handles and posts via Scraper Studio"
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
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    loading={busyId === competitor.id}
                    onClick={() => findHandles(competitor.id)}
                  >
                    Find handles
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    loading={busyId === competitor.id}
                    onClick={() => scrapeContent(competitor.id)}
                  >
                    Scrape posts
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
