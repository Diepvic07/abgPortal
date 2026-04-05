'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, CommunityCommitment, CommunityProposalComment, CommitmentLevel, COMMITMENT_LABELS, PROPOSAL_CATEGORY_LABELS } from '@/types';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500',
  'bg-lime-600', 'bg-yellow-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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

const STATUS_LABELS: Record<string, { en: string; vi: string }> = {
  published: { en: 'Open', vi: 'Đang mở' },
  selected: { en: 'Selected', vi: 'Đã chọn' },
  in_progress: { en: 'In Progress', vi: 'Đang thực hiện' },
  completed: { en: 'Completed', vi: 'Hoàn thành' },
  archived: { en: 'Archived', vi: 'Lưu trữ' },
  removed: { en: 'Removed', vi: 'Đã xóa' },
};

function timeAgo(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (lang === 'vi') {
    if (months > 0) return `${months} tháng trước`;
    if (weeks > 0) return `${weeks} tuần trước`;
    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'vừa xong';
  }
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

interface Props {
  proposalId: string;
}

export function ProposalDetail({ proposalId }: Props) {
  const { locale } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const [proposal, setProposal] = useState<CommunityProposal | null>(null);
  const [commitments, setCommitments] = useState<CommunityCommitment[]>([]);
  const [comments, setComments] = useState<CommunityProposalComment[]>([]);
  const [myCommitment, setMyCommitment] = useState<CommitmentLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingCommitment, setSubmittingCommitment] = useState(false);

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  async function fetchProposal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}`);
      if (!res.ok) {
        router.push('/events?tab=proposals');
        return;
      }
      const data = await res.json();
      setProposal(data.proposal);
      setCommitments(data.commitments || []);
      setComments(data.comments || []);
      setMyCommitment(data.proposal?.my_commitment || null);
    } catch {
      router.push('/events?tab=proposals');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit(level: CommitmentLevel) {
    setSubmittingCommitment(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment_level: level }),
      });
      if (res.ok) {
        await fetchProposal();
      }
    } catch {} finally {
      setSubmittingCommitment(false);
    }
  }

  async function handleUncommit() {
    setSubmittingCommitment(true);
    try {
      await fetch(`/api/community/proposals/${proposalId}/commit`, { method: 'DELETE' });
      await fetchProposal();
    } catch {} finally {
      setSubmittingCommitment(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText }),
      });
      if (res.ok) {
        setCommentText('');
        await fetchProposal();
      }
    } catch {} finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-2/3" /><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-32 bg-gray-200 rounded" /></div>;
  }

  if (!proposal) return null;

  const isTerminal = ['completed', 'archived', 'removed'].includes(proposal.status);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/events?tab=proposals" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {locale === 'vi' ? 'Quay lại Hoạt động' : 'Back to Events'}
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{CATEGORY_ICONS[proposal.category]}</span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[proposal.status]}`}>
            {(STATUS_LABELS[proposal.status] || { en: proposal.status, vi: proposal.status })[locale === 'vi' ? 'vi' : 'en']}
          </span>
          {proposal.is_pinned && <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">📌 Pinned</span>}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{proposal.title}</h1>
        <p className="text-gray-600">
          {locale === 'vi' ? 'bởi' : 'by'} {proposal.author_name || 'Unknown'}
          {proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
          {proposal.target_date ? ` · ${locale === 'vi' ? 'Mục tiêu' : 'Target'}: ${proposal.target_date}` : ''}
        </p>
      </div>

      {/* Score bar */}
      <div className="bg-blue-50 rounded-xl p-6 flex items-center gap-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{proposal.commitment_score}</div>
          <div className="text-sm text-blue-600">{locale === 'vi' ? 'Điểm cam kết' : 'Commitment Score'}</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{proposal.commitment_count}</div>
          <div className="text-sm text-gray-600">{locale === 'vi' ? 'Người tham gia' : 'Committed'}</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{proposal.comment_count}</div>
          <div className="text-sm text-gray-600">{locale === 'vi' ? 'Bình luận' : 'Comments'}</div>
        </div>
      </div>

      {/* Description */}
      <div className="prose max-w-none">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {locale === 'vi' ? 'Mô tả' : 'Description'}
        </h2>
        <div className="whitespace-pre-wrap text-gray-700">{proposal.description}</div>
      </div>

      {/* Reaction Bar — Facebook-style */}
      {!isTerminal && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Reaction summary */}
          <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100">
            <span className="flex -space-x-1">
              <span className="inline-block">🚀</span>
              <span className="inline-block">🙌</span>
              <span className="inline-block">❤️</span>
            </span>
            <span>{proposal.commitment_count} {locale === 'vi' ? 'người tham gia' : 'people committed'}</span>
          </div>

          {/* Reaction buttons — Will Lead first, then Will Join, then Interested */}
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {([
              { level: 'will_lead' as CommitmentLevel, icon: '🚀', label: locale === 'vi' ? 'Sẽ dẫn dắt' : 'Will Lead', pts: '+5' },
              { level: 'will_participate' as CommitmentLevel, icon: '🙌', label: locale === 'vi' ? 'Sẽ tham gia' : 'Will Join', pts: '+3' },
              { level: 'interested' as CommitmentLevel, icon: '❤️', label: locale === 'vi' ? 'Quan tâm' : 'Interested', pts: '' },
            ]).map(({ level, icon, label, pts }) => {
              const isActive = myCommitment === level;
              if (session) {
                return (
                  <button
                    key={level}
                    onClick={() => isActive ? handleUncommit() : handleCommit(level)}
                    disabled={submittingCommitment}
                    className={`flex flex-col items-center justify-center gap-0.5 py-3 text-sm font-medium transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 ${
                      isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'hover:scale-125'}`}>{icon}</span>
                      {label}
                    </span>
                    {pts && <span className="text-xs text-gray-400">{pts} {locale === 'vi' ? 'điểm' : 'pts'}</span>}
                  </button>
                );
              }
              return (
                <Link
                  key={level}
                  href="/login"
                  className="flex flex-col items-center justify-center gap-0.5 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xl hover:scale-125 transition-transform">{icon}</span>
                    {label}
                  </span>
                  {pts && <span className="text-xs text-gray-400">{pts} {locale === 'vi' ? 'điểm' : 'pts'}</span>}
                </Link>
              );
            })}
          </div>

          {!session && (
            <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 text-center">
              <Link href="/login" className="text-xs text-blue-600 hover:underline">
                {locale === 'vi' ? 'Đăng nhập để tham gia hoạt động này' : 'Sign in to join this event'}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Taskforce */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {locale === 'vi' ? 'Nhóm thực hiện' : 'Taskforce'} ({commitments.length})
        </h2>
        <div className="space-y-2">
          {commitments.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                  {(c.member_name || '?')[0]}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{c.member_name || 'Unknown'}</span>
                  {c.member_abg_class && <span className="text-sm text-gray-500 ml-2">{c.member_abg_class}</span>}
                  {c.member_id === proposal.created_by_member_id && (
                    <span className="text-xs font-medium text-blue-600 ml-2">
                      {locale === 'vi' ? 'Trưởng nhóm' : 'Lead'}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                c.commitment_level === 'will_lead' ? 'bg-blue-100 text-blue-700' :
                c.commitment_level === 'will_participate' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {COMMITMENT_LABELS[c.commitment_level][locale === 'vi' ? 'vi' : 'en']}
              </span>
            </div>
          ))}
          {commitments.length === 0 && (
            <p className="text-gray-500 text-sm">
              {locale === 'vi' ? 'Chưa có ai cam kết.' : 'No commitments yet.'}
            </p>
          )}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {locale === 'vi' ? 'Bình luận' : 'Comments'} ({comments.length})
        </h2>

        {session ? (
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={locale === 'vi' ? 'Viết bình luận...' : 'Write a comment...'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">{commentText.length}/2000</span>
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingComment ? '...' : (locale === 'vi' ? 'Gửi' : 'Post')}
              </button>
            </div>
          </form>
        ) : (
          <Link
            href="/login"
            className="mb-6 block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm text-center"
          >
            {locale === 'vi' ? '💬 Đăng nhập để bình luận' : '💬 Sign in to comment'}
          </Link>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {c.member_avatar_url ? (
                  <img src={c.member_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ${getAvatarColor(c.member_name || '?')}`}>
                    {(c.member_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-sm text-gray-900">{c.member_name || 'Unknown'}</span>
                <span className="text-xs text-gray-500">{timeAgo(c.created_at, locale || 'vi')}</span>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-500 text-sm">
              {locale === 'vi' ? 'Chưa có bình luận.' : 'No comments yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
