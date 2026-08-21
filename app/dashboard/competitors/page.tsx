'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { usePolling } from '@/lib/hooks/usePolling';

export default function CompetitorsPage() {
  const [brand, setBrand] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'discovered' | 'approved' | 'rejected'>('all');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const bRes = await fetch('/api/brands');
        const bData = await bRes.json();
        const currentBrand = bData.brands?.[0];
        setBrand(currentBrand);

        if (currentBrand) {
          const cRes = await fetch(`/api/brands/${currentBrand.id}/competitors`);
          const cData = await cRes.json();
          setCompetitors(cData.competitors || []);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Poll for competitors if discovery is running
  const { data: polledCompetitors, stop: stopPolling } = usePolling({
    enabled: brand?.competitor_discovery_status === 'running' || isDiscovering,
    fetcher: async () => {
      if (!brand) return [];
      
      // Check brand status first
      const bRes = await fetch('/api/brands');
      const bData = await bRes.json();
      const currentBrand = bData.brands?.[0];
      setBrand(currentBrand);

      if (currentBrand?.competitor_discovery_status === 'done') {
        setIsDiscovering(false);
      }

      // Fetch latest competitors
      const cRes = await fetch(`/api/brands/${brand.id}/competitors`);
      const cData = await cRes.json();
      return cData.competitors || [];
    },
    shouldStop: () => {
      // We stop polling when brand status is no longer 'running'
      // The fetcher updates the brand state, so we just check it next tick
      // Alternatively, we could return a composite object from fetcher.
      return false; 
    }
  });

  // Use polled data if available
  useEffect(() => {
    if (polledCompetitors && polledCompetitors.length > 0) {
      setCompetitors(polledCompetitors);
    }
  }, [polledCompetitors]);
  
  // Stop polling if brand status changes to done
  useEffect(() => {
      if (brand?.competitor_discovery_status === 'done') {
          setIsDiscovering(false);
          stopPolling();
      }
  }, [brand?.competitor_discovery_status, stopPolling]);


  async function handleDiscover() {
    if (!brand) return;
    setIsDiscovering(true);
    setBrand({ ...brand, competitor_discovery_status: 'running' });

    try {
      await fetch(`/api/brands/${brand.id}/discover-competitors`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to trigger discovery', err);
      setIsDiscovering(false);
      setBrand({ ...brand, competitor_discovery_status: 'failed' });
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    // Optimistic update
    setCompetitors(comps =>
      comps.map(c => (c.id === id ? { ...c, status } : c))
    );

    try {
      await fetch(`/api/competitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Failed to update competitor status', err);
      // Revert if needed (simplified here)
    }
  }

  const filteredCompetitors = competitors.filter(c => {
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
        subtitle="Review and manage competitors discovered for your brand"
        actions={
          brand && (
            <Button
              onClick={handleDiscover}
              loading={brand.competitor_discovery_status === 'running' || isDiscovering}
              disabled={!brand.context}
            >
              Discover competitors
            </Button>
          )
        }
      />

      <div className="p-8 space-y-6">
        {!brand?.context && (
          <div className="bg-warning-50 border border-warning-200 text-warning-800 p-4 rounded-lg flex items-center gap-3">
             <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-sm">Brand context missing</p>
              <p className="text-sm">We need to finish scraping your brand website before discovering competitors.</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {(['all', 'discovered', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                filter === f
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Competitor Grid */}
        {filteredCompetitors.length === 0 ? (
          <EmptyState
            title="No competitors found"
            description={
              filter === 'all'
                ? "Click 'Discover competitors' to let our AI find them based on your brand context."
                : `No competitors in the ${filter} state.`
            }
            action={
               filter === 'all' && brand?.context ? (
                <Button onClick={handleDiscover}>Find Competitors</Button>
               ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {filteredCompetitors.map(competitor => (
              <Card key={competitor.id} className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{competitor.name}</h3>
                    {competitor.website_url && (
                      <a
                        href={competitor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline break-all"
                      >
                        {competitor.website_url}
                      </a>
                    )}
                  </div>
                  <Badge variant={statusToBadgeVariant(competitor.status)}>
                    {competitor.status}
                  </Badge>
                </div>
                
                {/* Optional description or confidence score */}
                {competitor.confidence_score && (
                  <div className="mt-auto pt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>Relevance score</span>
                    <span className="font-medium text-slate-700">
                      {Math.round(competitor.confidence_score * 100)}%
                    </span>
                  </div>
                )}

                {/* Actions */}
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
