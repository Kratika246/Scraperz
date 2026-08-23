'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/dashboard/TopBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { BufferChannel } from '@/lib/buffer';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenMasked, setTokenMasked] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [tokenStatus, setTokenStatus] = useState<'not_configured' | 'connected' | 'error'>('not_configured');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [publishJobs, setPublishJobs] = useState<any[]>([]);

  // Default channel selections
  const [linkedinChannel, setLinkedinChannel] = useState('');
  const [twitterChannel, setTwitterChannel] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/buffer/settings');
      const data = await res.json();
      if (data.ok) {
        setTokenStatus(data.token_status || 'not_configured');
        setChannels(data.channels || []);
        setErrorMessage(data.error_message || '');
        setTokenConfigured(Boolean(data.token_configured));
        setTokenMasked(data.token_masked || '');
        if (data.settings?.linkedin_channel) setLinkedinChannel(data.settings.linkedin_channel);
        if (data.settings?.twitter_channel) setTwitterChannel(data.settings.twitter_channel);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch settings');
    }
  }, []);

  const loadPublishJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/generated-content');
      const data = await res.json();
      const published = (data.content || []).filter((c: any) => c.status === 'published' || c.published_url);
      setPublishJobs(published);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshPermalinks = useCallback(async () => {
    setRefreshing(true);
    setRefreshMessage('');
    setRefreshError('');
    try {
      const res = await fetch('/api/publish/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRefreshError(data.error || 'Failed to refresh permalinks');
      } else {
        // Use the refreshed content returned directly from the API if available
        if (Array.isArray(data.content) && data.content.length > 0) {
          const published = data.content.filter((c: any) => c.status === 'published' || c.published_url);
          setPublishJobs(published);
        } else {
          await loadPublishJobs();
        }
        const count = data.refreshed ?? 0;
        setRefreshMessage(
          count > 0
            ? `Refreshed ${count} post permalink${count !== 1 ? 's' : ''} from Buffer.`
            : 'Status checked — no new permalink updates found.'
        );
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Error refreshing permalinks');
    } finally {
      setRefreshing(false);
    }
  }, [loadPublishJobs]);

  useEffect(() => {
    async function boot() {
      await Promise.all([loadSettings(), loadPublishJobs()]);
      setLoading(false);
    }
    boot();
  }, [loadSettings, loadPublishJobs]);

  async function handleSave() {
    setSaving(true);
    setErrorMessage('');
    setSaveMessage('');
    try {
      const payload: Record<string, unknown> = {
        buffer_settings: {
          linkedin_channel: linkedinChannel,
          twitter_channel: twitterChannel,
        },
      };
      if (token.trim()) {
        payload.buffer_access_token = token.trim();
      }

      const res = await fetch('/api/buffer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save Buffer settings');
        setTokenStatus('error');
      } else {
        setChannels(data.channels || []);
        setTokenStatus(data.token_status || 'connected');
        setTokenConfigured(Boolean(data.token_configured));
        setTokenMasked(data.token_masked || '');
        setToken('');
        setSaveMessage(data.message || 'Buffer settings saved for this workspace.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating settings');
      setTokenStatus('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <>
      <TopBar
        title="Settings & Integrations"
        subtitle="Manage Buffer API connection, view connected social channels, and configure publishing defaults"
      />

      <div className="p-8 space-y-8 max-w-5xl">
        {/* Buffer API Integration Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Buffer API Integration</span>
                {tokenStatus === 'connected' && (
                  <Badge variant="success" dot>
                    Connected ({channels.length} channels)
                  </Badge>
                )}
                {tokenStatus === 'error' && <Badge variant="danger">Connection Error</Badge>}
                {tokenStatus === 'not_configured' && <Badge variant="warning">Not Configured</Badge>}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Save your Buffer access token once. It is stored on this workspace and reused for publishing — you do not need to paste it again.
              </p>
            </div>

            <a
              href="https://buffer.com/developers/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
            >
              Get Token on Buffer Developer Portal ↗
            </a>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          {saveMessage && !errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-success-50 border border-success-200 text-success-800 text-xs font-medium">
              {saveMessage}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Buffer Access Token
              </label>
              {tokenConfigured && tokenMasked && (
                <p className="text-xs text-slate-500 mb-1.5">
                  Saved for this workspace: <span className="font-mono text-slate-700">{tokenMasked}</span>
                </p>
              )}
              <div className="relative flex items-center">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={
                    tokenConfigured
                      ? 'Leave blank to keep the saved token, or paste a new one to replace it'
                      : 'Paste your Buffer access token...'
                  }
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} loading={saving}>
                Test Connection & Save
              </Button>
            </div>
          </div>
        </Card>

        {/* Connected Channels Grid */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Connected Social Channels</h2>
          <p className="text-xs text-slate-500 mb-4">
            Social profiles retrieved directly from your connected Buffer account.
          </p>

          {channels.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-1">No channels connected yet</p>
              <p className="text-xs text-slate-500">
                Enter your Buffer Access Token above and click &quot;Test Connection & Save&quot; to fetch your connected LinkedIn, Twitter/X, and Instagram channels.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3.5 hover:border-slate-300 transition-all"
                >
                  {channel.avatar_https ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={channel.avatar_https}
                      alt=""
                      className="w-10 h-10 rounded-full border border-slate-200 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase flex-shrink-0">
                      {channel.service.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {channel.formatted_username}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-primary-600">{channel.service}</span>
                      <span>• ID: {channel.id.slice(0, 8)}...</span>
                    </p>
                  </div>

                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Channel Defaults Selection */}
        {channels.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Channel Mapping Defaults</h2>
            <p className="text-xs text-slate-500 mb-4">
              Specify default target channels when publishing approved content.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default LinkedIn Channel
                </label>
                <select
                  value={linkedinChannel}
                  onChange={(e) => setLinkedinChannel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Auto-detect LinkedIn Channel</option>
                  {channels
                    .filter((c) => c.service.includes('linkedin'))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.formatted_username} ({c.id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Twitter / X Channel
                </label>
                <select
                  value={twitterChannel}
                  onChange={(e) => setTwitterChannel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Auto-detect Twitter/X Channel</option>
                  {channels
                    .filter((c) => c.service.includes('twitter') || c.service.includes('x'))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.formatted_username} ({c.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={handleSave} loading={saving}>
                Save Channel Defaults
              </Button>
            </div>
          </Card>
        )}

        {/* Live Published Content & Reconciliation */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Published Content & Live URLs</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track status and live permalinks for posts published to Buffer social channels.
              </p>
            </div>

            <Button size="sm" variant="secondary" onClick={refreshPermalinks} loading={refreshing}>
              Refresh Status
            </Button>
          </div>

          {refreshError && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-800 text-xs font-medium">
              {refreshError}
            </div>
          )}
          {refreshMessage && !refreshError && (
            <div className="mb-4 p-3 rounded-lg bg-success-50 border border-success-200 text-success-800 text-xs font-medium">
              {refreshMessage}
            </div>
          )}

          {publishJobs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No published posts yet. Approve drafts in the Approval Center to dispatch them to your Buffer channels.
            </p>
          ) : (
            <div className="space-y-3">
              {publishJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="success">Published</Badge>
                      <Badge variant="info">{job.platform}</Badge>
                      <span className="text-xs text-slate-400">
                        {job.published_at
                          ? new Date(job.published_at).toLocaleString()
                          : new Date(job.updated_at || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {job.title}
                    </h3>
                  </div>

                  {job.published_url && (
                    <a
                      href={job.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition flex-shrink-0"
                    >
                      <span>🔗 View Live Post</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
