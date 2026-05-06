'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, ProposalStatus, PROPOSAL_CATEGORY_LABELS } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  charity: '❤️', event: '🎉', learning: '📚', community_support: '🤝', other: '💡',
};

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  selected: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-800',
};

const ALL_STATUSES: ProposalStatus[] = ['published', 'selected', 'in_progress', 'completed', 'archived', 'removed'];

function CreateEventModal({ proposal, t, onClose, onCreated }: {
  proposal: CommunityProposal;
  t: ReturnType<typeof useTranslation>['t'];
  onClose: () => void;
  onCreated: (msg: string) => void;
}) {
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventMode, setEventMode] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [capacity, setCapacity] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventDate) return;

    setCreating(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        event_mode: eventMode,
        event_date: new Date(eventDate).toISOString(),
      };
      if (eventEndDate) body.event_end_date = new Date(eventEndDate).toISOString();
      if (location) body.location = location;
      if (locationUrl) body.location_url = locationUrl;
      if (capacity) body.capacity = parseInt(capacity, 10);

      const res = await fetch(`/api/admin/community/events/from-proposal/${proposal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onCreated(t.admin.proposals.eventCreated);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || t.admin.proposals.eventCreateFailed);
      }
    } catch {
      setError(t.admin.proposals.eventCreateFailed);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t.admin.proposals.createEventFrom}</h3>
          <p className="text-sm text-gray-500 mb-4 line-clamp-1">{proposal.title}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.eventDate} *</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.eventEndDate}</label>
              <input
                type="datetime-local"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.eventMode}</label>
              <select
                value={eventMode}
                onChange={(e) => setEventMode(e.target.value as 'offline' | 'online' | 'hybrid')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.location}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Read Station, Ha Noi"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.locationUrl}</label>
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.capacity}</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min="1"
                placeholder="50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.admin.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={creating || !eventDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? t.admin.proposals.creating : t.admin.proposals.createEvent}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminProposalManager() {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [createEventProposal, setCreateEventProposal] = useState<CommunityProposal | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch('/api/community/proposals?limit=100&status=all');
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(proposalId: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(proposalId);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/community/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        setMessage(t.admin.proposals.actionSuccess.replace('{action}', action));
        await fetchProposals();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage(t.admin.messages.somethingWrong);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRecalculate() {
    setActionLoading('recalculate');
    try {
      const res = await fetch('/api/admin/community/proposals/recalculate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(t.admin.proposals.recalcSuccess.replace('{count}', String(data.recalculated)));
        await fetchProposals();
      }
    } catch {
      setMessage(t.admin.proposals.recalcFailed);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t.admin.proposals.title} ({proposals.length})</h2>
        <button
          onClick={handleRecalculate}
          disabled={actionLoading === 'recalculate'}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {actionLoading === 'recalculate' ? t.admin.proposals.recalculating : `🔄 ${t.admin.proposals.recalculate}`}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{message}</div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t.admin.proposals.noProposals}</div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{CATEGORY_ICONS[proposal.category] || '💡'}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[proposal.status]}`}>
                      {proposal.status}
                    </span>
                    {proposal.is_pinned && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">📌 {t.admin.members.pinned}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{proposal.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.admin.proposals.by} {proposal.author_name || 'Unknown'} · {t.admin.proposals.score} {proposal.commitment_score} · {proposal.commitment_count} {t.admin.proposals.committed} · {proposal.comment_count} {t.admin.proposals.comments}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{proposal.description}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {/* Edit */}
                  <Link
                    href={`/proposals/${proposal.slug || proposal.id}`}
                    className="text-xs px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-center"
                  >
                    ✏️ {t.admin.actions.edit || 'Edit'}
                  </Link>

                  {/* Pin/Unpin */}
                  <button
                    onClick={() => handleAction(proposal.id, 'pin')}
                    disabled={actionLoading === proposal.id}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {proposal.is_pinned ? `📌 ${t.admin.proposals.unpin}` : `📌 ${t.admin.proposals.pin}`}
                  </button>

                  {/* Create Event - show for published/selected proposals */}
                  {(proposal.status === 'published' || proposal.status === 'selected') && (
                    <button
                      onClick={() => setCreateEventProposal(proposal)}
                      className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 font-medium"
                    >
                      🎉 {t.admin.proposals.createEvent}
                    </button>
                  )}

                  {/* Status dropdown */}
                  <select
                    value={proposal.status}
                    onChange={(e) => handleAction(proposal.id, 'status', { status: e.target.value })}
                    disabled={actionLoading === proposal.id}
                    className="text-xs px-3 py-1.5 border rounded-lg bg-white disabled:opacity-50"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Remove */}
                  {proposal.status !== 'removed' && (
                    <button
                      onClick={() => {
                        if (confirm(t.admin.proposals.removeConfirm)) {
                          handleAction(proposal.id, 'remove');
                        }
                      }}
                      disabled={actionLoading === proposal.id}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      🗑️ {t.admin.actions.remove}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createEventProposal && (
        <CreateEventModal
          proposal={createEventProposal}
          t={t}
          onClose={() => setCreateEventProposal(null)}
          onCreated={(msg) => {
            setMessage(msg);
            fetchProposals();
          }}
        />
      )}
    </div>
  );
}
