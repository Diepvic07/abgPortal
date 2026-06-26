'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import type { CommunityProposal, ProposalStatus } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  charity: '❤️', event: '🎉', learning: '📚', community_support: '🤝', project: '🚀', other: '💡',
};

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-800',
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-600',
  project_active: 'bg-indigo-100 text-indigo-800',
  project_completed: 'bg-emerald-100 text-emerald-800',
  project_discontinued: 'bg-orange-100 text-orange-800',
  project_closed: 'bg-amber-100 text-amber-800',
  removed: 'bg-red-100 text-red-800',
};

// Dropdown excludes 'project_active' on purpose — moving INTO project_active
// requires the chat-URL + public-note flow on the proposal page. The other
// project_* end-states are reachable here so admins can record the outcome.
const DROPDOWN_STATUSES: ProposalStatus[] = [
  'published',
  'upcoming',
  'completed',
  'archived',
  'project_completed',
  'project_discontinued',
  'project_closed',
  'removed',
];

// Promote-to-Event is only meaningful while the proposal is still in the
// pre-event lifecycle. Removed/completed proposals (already promoted, or
// archived) and project_* proposals (different lifecycle entirely) hide it.
const PROMOTABLE_STATUSES: ProposalStatus[] = ['published', 'upcoming'];

function defaultEventDate(proposal: CommunityProposal): string {
  // datetime-local wants 'YYYY-MM-DDTHH:mm'
  const base = proposal.target_date ? new Date(proposal.target_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function AdminProposalManager() {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [promotingProposal, setPromotingProposal] = useState<CommunityProposal | null>(null);
  const [promoteDate, setPromoteDate] = useState('');
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [promoteError, setPromoteError] = useState('');

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

  function openPromote(proposal: CommunityProposal) {
    setPromotingProposal(proposal);
    setPromoteDate(defaultEventDate(proposal));
    setPromoteError('');
  }

  function closePromote() {
    if (promoteSubmitting) return;
    setPromotingProposal(null);
    setPromoteDate('');
    setPromoteError('');
  }

  async function handlePromoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promotingProposal || !promoteDate) return;
    setPromoteSubmitting(true);
    setPromoteError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/community/events/from-proposal/${promotingProposal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: new Date(promoteDate).toISOString(),
          is_public: true,
        }),
      });
      if (res.ok) {
        setMessage(t.admin.proposals.eventCreated);
        setPromotingProposal(null);
        setPromoteDate('');
        await fetchProposals();
      } else {
        const data = await res.json();
        setPromoteError(data.error || t.admin.proposals.eventCreateFailed);
      }
    } catch {
      setPromoteError(t.admin.messages.somethingWrong);
    } finally {
      setPromoteSubmitting(false);
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

                  {/* Promote to Event */}
                  {PROMOTABLE_STATUSES.includes(proposal.status) && (
                    <button
                      onClick={() => openPromote(proposal)}
                      disabled={actionLoading === proposal.id}
                      className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                    >
                      🎉 {t.admin.proposals.promoteToEvent}
                    </button>
                  )}

                  {/* Status dropdown — does not include project_active.
                      Moving into project_active happens on the proposal page
                      where the chat URL / public note can be captured. */}
                  <select
                    value={proposal.status}
                    onChange={(e) => handleAction(proposal.id, 'status', { status: e.target.value })}
                    disabled={actionLoading === proposal.id || proposal.status === 'project_active'}
                    className="text-xs px-3 py-1.5 border rounded-lg bg-white disabled:opacity-50"
                  >
                    {proposal.status === 'project_active' && (
                      <option value="project_active">project_active</option>
                    )}
                    {DROPDOWN_STATUSES.map((s) => (
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

      {promotingProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closePromote}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{t.admin.proposals.promoteTitle}</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{promotingProposal.title}</p>
            </div>
            <form onSubmit={handlePromoteSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.proposals.eventDate} *</label>
                <input
                  type="datetime-local"
                  value={promoteDate}
                  onChange={(e) => setPromoteDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                {t.admin.proposals.promoteHint}
              </div>
              {promoteError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {promoteError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePromote}
                  disabled={promoteSubmitting}
                  className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.admin.actions.cancel}
                </button>
                <button
                  type="submit"
                  disabled={promoteSubmitting || !promoteDate}
                  className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {promoteSubmitting ? t.admin.proposals.creating : `🎉 ${t.admin.proposals.promoteToEvent}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
