'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function ApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/generated-content');
    const data = await res.json();
    const drafts = (data.content || []).filter((c: { status: string }) =>
      ['draft', 'approved'].includes(c.status)
    );
    setItems(drafts);
    setSelectedId((current) => current || drafts[0]?.id || '');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedItem = items.find((i) => i.id === selectedId);

  async function handleApprove() {
    if (!selectedItem) return;
    setBusy(true);
    await fetch(`/api/generated-content/${selectedItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', review_notes: reviewNotes }),
    });
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: selectedItem.id, profile_id: 'demo-profile' }),
    });
    await load();
    setBusy(false);
  }

  async function handleReject() {
    if (!selectedItem) return;
    setBusy(true);
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
          <h1 className="text-2xl font-bold text-slate-900">Approval Center</h1>
          <p className="text-sm text-slate-500 mt-1">Approve drafts, then the publish API queues the job.</p>
        </div>
        <div className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white">
          {items.filter((i) => i.status === 'draft').length} pending
        </div>
      </header>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px]">
        <div className="col-span-1 lg:col-span-4 flex flex-col h-[calc(100vh-180px)]">
          <Card className="flex-1 flex flex-col p-6 overflow-hidden" padding="none">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Inbox</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 rounded-xl ${
                    selectedId === item.id ? 'bg-primary-100/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={item.platform === 'blog' ? 'success' : 'info'}>
                      {item.platform === 'blog' ? 'Blog Article' : item.platform}
                    </Badge>
                    <span className="text-xs text-slate-400 capitalize">{item.status}</span>
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-slate-500 py-10 text-center">
                  Generate content first, then it shows up here.
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
                    <Badge variant="primary">{selectedItem.status}</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedItem.title}</h2>
                </div>
              </div>

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
              <div className="mt-8">
                <label className="block text-xs text-slate-500 mb-2">Review notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="secondary" className="flex-1" onClick={handleReject} disabled={busy}>
                  Request changes
                </Button>
                <Button className="flex-1" onClick={handleApprove} loading={busy}>
                  Approve & queue publish
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center p-8 text-slate-400">
              Select an item to review
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
