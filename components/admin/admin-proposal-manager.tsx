'use client';

import { useState, useEffect } from 'react';
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

export function AdminProposalManager() {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProposals();
  }, []);

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch('/api/community/proposals?limit=100');
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
                  {/* Pin/Unpin */}
                  <button
                    onClick={() => handleAction(proposal.id, 'pin')}
                    disabled={actionLoading === proposal.id}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {proposal.is_pinned ? `📌 ${t.admin.proposals.unpin}` : `📌 ${t.admin.proposals.pin}`}
                  </button>

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
    </div>
  );
}
