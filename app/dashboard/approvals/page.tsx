'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge, { statusToBadgeVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { BufferChannel } from '@/lib/buffer';

export default function ApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/generated-content');
    const data = await res.json();
    const drafts = (data.content || []).filter((c: { status: string }) =>
      ['draft', 'approved', 'published'].includes(c.status)
    );
    setItems(drafts);
    setSelectedId((current) => current || drafts[0]?.id || '');
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/buffer/settings');
      const data = await res.json();
      if (data.ok && data.channels) {
        setChannels(data.channels);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    loadChannels();
  }, [load, loadChannels]);

  const selectedItem = items.find((i) => i.id === selectedId);

  async function handleApprove() {
    if (!selectedItem) return;
    setBusy(true);
    setPublishSuccessMsg('');
    try {
      await fetch(`/api/generated-content/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', review_notes: reviewNotes }),
      });

      const pRes = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: selectedItem.id,
          profile_id: selectedProfileId || undefined,
        }),
      });

      const pData = await pRes.json();
      if (pRes.ok) {
        setPublishSuccessMsg(
          pData.published_url
            ? `Published successfully! Live link: ${pData.published_url}`
            : 'Approved & dispatched to Buffer!'
        );
      } else {
        alert(pData.error || 'Publishing failed');
      }

      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving post');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!selectedItem) return;
    setBusy(true);
    setPublishSuccessMsg('');
    await fetch(`/api/generated-content/${selectedItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', review_notes: reviewNotes }),
    });
    await load();
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-8 py-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval & Publishing Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review AI drafts, select connected Buffer channels, and publish directly to your social feeds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white">
            {items.filter((i) => i.status === 'draft').length} pending review
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px]">
        <div className="col-span-1 lg:col-span-4 flex flex-col h-[calc(100vh-180px)]">
          <Card className="flex-1 flex flex-col p-6 overflow-hidden" padding="none">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Content Inbox</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setPublishSuccessMsg('');
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedId === item.id ? 'bg-primary-100/50 border border-primary-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={item.platform === 'blog' ? 'success' : 'info'}>
                      {item.platform === 'blog' ? 'Blog Article' : item.platform}
                    </Badge>
                    <Badge variant={statusToBadgeVariant(item.status)}>{item.status}</Badge>
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-slate-500 py-10 text-center">
                  Generate content first, then it shows up here for approval.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-8 flex flex-col h-[calc(100vh-180px)]">
          {selectedItem ? (
            <Card className="flex-1 flex flex-col p-8 overflow-y-auto" padding="none">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={selectedItem.platform === 'blog' ? 'success' : 'info'}>
                      {selectedItem.platform === 'blog' ? 'Blog Article' : selectedItem.platform}
                    </Badge>
                    <Badge variant={statusToBadgeVariant(selectedItem.status)}>
                      {selectedItem.status}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedItem.title}</h2>
                </div>

                {selectedItem.published_url && (
                  <a
                    href={selectedItem.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 transition shadow-sm"
                  >
                    <span>🔗 View Live Post ↗</span>
                  </a>
                )}
              </div>

              {publishSuccessMsg && (
                <div className="mb-6 p-4 rounded-xl bg-success-50 border border-success-200 text-success-800 text-xs font-medium flex items-center justify-between">
                  <span>{publishSuccessMsg}</span>
                  {selectedItem.published_url && (
                    <a
                      href={selectedItem.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline ml-2"
                    >
                      Open Link ↗
                    </a>
                  )}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                {selectedItem.draft_text}
              </div>

              {selectedItem.generated_image_urls?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.generated_image_urls[0]}
                  alt=""
                  className="mt-6 rounded-xl border border-slate-200 max-w-lg object-cover"
                />
              )}

              {/* Buffer Target Channel Selector */}
              {selectedItem.status !== 'published' && (
                <div className="mt-6 p-4 rounded-xl bg-slate-100/70 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Buffer Social Channel
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Auto-detect channel for {selectedItem.platform}</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.formatted_username} ({c.service})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {channels.length > 0
                      ? `${channels.length} channel(s) connected to Buffer API`
                      : 'No Buffer token configured — will run in simulation mode with working live post links.'}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Review & Editorial Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add feedback or review comments..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="secondary" className="flex-1" onClick={handleReject} disabled={busy}>
                  Request Changes / Reject
                </Button>
                <Button className="flex-1" onClick={handleApprove} loading={busy}>
                  {selectedItem.status === 'published' ? 'Republish to Buffer' : 'Approve & Publish via Buffer'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center p-8 text-slate-400">
              Select an item from the inbox to review
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
