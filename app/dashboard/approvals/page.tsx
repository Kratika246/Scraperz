'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

// Mock data since we can't fetch real generated content yet
const mockPendingItems = [
  {
    id: '1',
    title: 'Enterprise AI security',
    platform: 'LinkedIn',
    content_type: 'Post',
    score: 93,
    time: '2m ago',
    initial: 'E',
    draft_text: `Enterprise AI security isn't a checklist.\nIt is becoming a buying decision.\n\nAs teams adopt AI agents and workflow automation, security is moving from a nice-to-have to a core part of the evaluation process.\n\nThe strongest teams are asking three questions:\n1. What data can the workflow access?\n2. Where are approvals and controls enforced?\n3. How is activity monitored after deployment?`,
    opportunity_score: 93,
    competitor_mentions: 8,
    evidence: { social_posts: 5, website_changes: 2 },
    images: []
  },
  {
    id: '2',
    title: 'AI workflow checklist',
    platform: 'Blog',
    content_type: 'Article',
    score: 87,
    time: '28m ago',
    initial: 'A',
    draft_text: 'Draft content for blog...',
    opportunity_score: 87,
    competitor_mentions: 3,
    evidence: { social_posts: 2, website_changes: 1 },
    images: []
  },
  {
    id: '3',
    title: 'Integration playbook',
    platform: 'LinkedIn',
    content_type: 'Carousel',
    score: 81,
    time: '1h ago',
    initial: 'I',
    draft_text: 'Draft content for carousel...',
    opportunity_score: 81,
    competitor_mentions: 5,
    evidence: { social_posts: 4, website_changes: 0 },
    images: ['https://placehold.co/600x400/png'] // Example generated image
  }
];

export default function ApprovalsPage() {
  const [items, setItems] = useState(mockPendingItems);
  const [selectedId, setSelectedId] = useState(mockPendingItems[0].id);
  const [reviewNotes, setReviewNotes] = useState('Looks aligned with our positioning.');
  
  const selectedItem = items.find(i => i.id === selectedId);

  async function handleApprove() {
    if (!selectedItem) return;
    
    // In real app: call API to approve and schedule via Buffer
    // await fetch(`/api/generated-content/${selectedItem.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
    // await fetch('/api/publish', { method: 'POST', body: JSON.stringify({ content_id: selectedItem.id }) });
    
    // Optimistic UI update
    setItems(items.filter(i => i.id !== selectedItem.id));
    if (items.length > 1) {
        setSelectedId(items.find(i => i.id !== selectedItem.id)?.id || '');
    } else {
        setSelectedId('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-8 py-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Center</h1>
          <p className="text-sm text-slate-500 mt-1">Review content before it is scheduled and published.</p>
        </div>
        <div className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white">
          {items.length} pending
        </div>
      </header>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px]">
        {/* Left Panel: List */}
        <div className="col-span-1 lg:col-span-4 flex flex-col h-[calc(100vh-180px)]">
          <Card className="flex-1 flex flex-col p-6 overflow-hidden" padding="none">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Pending approval</h2>
              <p className="text-sm text-slate-500">{items.length} items ready for review</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 rounded-xl flex gap-4 transition-colors ${
                    selectedId === item.id 
                      ? 'bg-primary-100/50' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-0.5">
                    {item.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{item.platform} • {item.content_type}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-500">{item.score} score</span>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                  </div>
                </button>
              ))}

              {items.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-500">No pending approvals.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <select className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500/20">
                <option>Sort: newest first</option>
                <option>Sort: highest score</option>
              </select>
            </div>
            
            <div className="mt-8">
               <h4 className="text-xs font-semibold text-primary-600 mb-2">Approval rules</h4>
               <p className="text-xs text-slate-500 leading-relaxed mb-4">
                 Human approval is required before Buffer publishing. No automatic publishing occurs.
               </p>
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-success-500" />
                   <span className="text-xs font-medium text-slate-700">Evidence attached</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-success-500" />
                   <span className="text-xs font-medium text-slate-700">Brand context applied</span>
                 </div>
               </div>
            </div>
          </Card>
        </div>

        {/* Right Panel: Detail */}
        <div className="col-span-1 lg:col-span-8 flex flex-col h-[calc(100vh-180px)]">
          {selectedItem ? (
            <Card className="flex-1 flex flex-col p-8 overflow-y-auto" padding="none">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Review draft</h2>
                <Badge variant="primary">Evidence linked</Badge>
              </div>

              {/* Draft Content */}
              <div className="prose prose-slate max-w-none flex-1">
                {selectedItem.draft_text.split('\n').map((paragraph, i) => (
                  <p key={i} className="text-slate-800 text-[15px] leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}

                {/* Generated Images */}
                {selectedItem.images && selectedItem.images.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-4">
                        {selectedItem.images.map((img, i) => (
                             <img key={i} src={img} alt="Generated post media" className="rounded-xl border border-slate-200" />
                        ))}
                    </div>
                )}
              </div>

              {/* Context Box */}
              <div className="bg-primary-100/50 rounded-xl p-5 mt-8 mb-6">
                <h4 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                  INTELLIGENCE CONTEXT
                </h4>
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  Opportunity score {selectedItem.opportunity_score} • {selectedItem.competitor_mentions} competitor mentions
                </p>
                <p className="text-sm text-slate-500">
                  Evidence: {selectedItem.evidence.social_posts} social posts • {selectedItem.evidence.website_changes} website changes
                </p>
              </div>

              {/* Review Notes */}
              <div className="mb-8">
                <label className="block text-xs text-slate-500 mb-2">Review notes</label>
                <textarea 
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div>
                <p className="text-xs text-slate-500 mb-3">Ready to publish via Buffer after approval.</p>
                <div className="flex gap-4">
                  <Button variant="secondary" className="flex-1 bg-white text-slate-700 border border-slate-200 shadow-none hover:bg-slate-50">
                    Request changes
                  </Button>
                  <Button onClick={handleApprove} className="flex-1 bg-slate-500 hover:bg-slate-600 border-none">
                    Approve & send to Buffer →
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 text-center">
                  Approval creates a scheduled publishing job — it does not publish immediately.
                </p>
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
