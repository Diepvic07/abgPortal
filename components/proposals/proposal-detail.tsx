'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { linkifyText } from '@/lib/linkify';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, CommunityCommitment, CommunityProposalComment, CommitmentLevel, COMMITMENT_LABELS, COMMITMENT_WEIGHTS, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS } from '@/types';
import { CommentReactions } from '@/components/ui/comment-reactions';

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [currentMemberAvatarUrl, setCurrentMemberAvatarUrl] = useState<string | null>(null);
  const [currentMemberIsAdmin, setCurrentMemberIsAdmin] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [submittingCommitment, setSubmittingCommitment] = useState(false);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const commentImageRef = useRef<HTMLInputElement>(null);
  const replyImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  async function fetchProposal(silent = false) {
    if (!silent) setLoading(true);
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
      if (data.currentMemberId) setCurrentMemberId(data.currentMemberId);
      if (data.currentMemberAvatarUrl) setCurrentMemberAvatarUrl(data.currentMemberAvatarUrl);
      if (data.currentMemberIsAdmin) setCurrentMemberIsAdmin(true);
    } catch {
      router.push('/events?tab=proposals');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit(level: CommitmentLevel) {
    setSubmittingCommitment(true);
    const prevCommitments = commitments;
    const prevProposal = proposal;
    const prevMyCommitment = myCommitment;

    // Optimistic update
    const existingIdx = commitments.findIndex(c => c.member_id === currentMemberId);
    const now = new Date().toISOString();
    const newEntry: CommunityCommitment = {
      id: existingIdx >= 0 ? commitments[existingIdx].id : 'temp-' + Date.now(),
      proposal_id: proposalId,
      member_id: currentMemberId || '',
      commitment_level: level,
      created_at: existingIdx >= 0 ? commitments[existingIdx].created_at : now,
      updated_at: now,
      member_name: session?.user?.name || 'Me',
      member_avatar_url: currentMemberAvatarUrl || session?.user?.image || undefined,
      member_abg_class: existingIdx >= 0 ? commitments[existingIdx].member_abg_class : undefined,
    };
    const newCommitments = existingIdx >= 0
      ? commitments.map((c, i) => i === existingIdx ? newEntry : c)
      : [...commitments, newEntry];
    setCommitments(newCommitments);
    setMyCommitment(level);
    if (proposal) {
      const newScore = newCommitments.reduce((s, c) => s + (COMMITMENT_WEIGHTS[c.commitment_level] || 0), 0);
      setProposal({ ...proposal, commitment_count: newCommitments.length, commitment_score: newScore });
    }

    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment_level: level }),
      });
      if (!res.ok) {
        setCommitments(prevCommitments);
        setProposal(prevProposal);
        setMyCommitment(prevMyCommitment);
      }
    } catch {
      setCommitments(prevCommitments);
      setProposal(prevProposal);
      setMyCommitment(prevMyCommitment);
    } finally {
      setSubmittingCommitment(false);
    }
  }

  async function handleUncommit() {
    setSubmittingCommitment(true);
    const prevCommitments = commitments;
    const prevProposal = proposal;
    const prevMyCommitment = myCommitment;

    // Optimistic update
    const newCommitments = commitments.filter(c => c.member_id !== currentMemberId);
    setCommitments(newCommitments);
    setMyCommitment(null);
    if (proposal) {
      const newScore = newCommitments.reduce((s, c) => s + (COMMITMENT_WEIGHTS[c.commitment_level] || 0), 0);
      setProposal({ ...proposal, commitment_count: newCommitments.length, commitment_score: newScore });
    }

    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/commit`, { method: 'DELETE' });
      if (!res.ok) {
        setCommitments(prevCommitments);
        setProposal(prevProposal);
        setMyCommitment(prevMyCommitment);
      }
    } catch {
      setCommitments(prevCommitments);
      setProposal(prevProposal);
      setMyCommitment(prevMyCommitment);
    } finally {
      setSubmittingCommitment(false);
    }
  }

  const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','👍','👏','🎉','🔥','❤️','💯','🙏','😢','😮','✅','⭐','💪','🤝','👀'];

  function insertEmoji(emoji: string, isReply?: boolean) {
    if (isReply) {
      setReplyBody(prev => prev + emoji);
    } else {
      setCommentText(prev => prev + emoji);
    }
    setShowEmojiPicker(null);
  }

  function handleCommentImageSelect(e: React.ChangeEvent<HTMLInputElement>, isReply?: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return;
    const url = URL.createObjectURL(file);
    if (isReply) {
      setReplyImageFile(file);
      setReplyImagePreview(url);
    } else {
      setCommentImageFile(file);
      setCommentImagePreview(url);
    }
  }

  function clearCommentImage(isReply?: boolean) {
    if (isReply) {
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
      setReplyImageFile(null);
      setReplyImagePreview(null);
      if (replyImageRef.current) replyImageRef.current.value = '';
    } else {
      if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
      setCommentImageFile(null);
      setCommentImagePreview(null);
      if (commentImageRef.current) commentImageRef.current.value = '';
    }
  }

  async function uploadCommentImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/community/comments/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    return null;
  }

  async function handleComment(e: React.FormEvent, parentCommentId?: string) {
    e.preventDefault();
    const body = parentCommentId ? replyBody.trim() : commentText.trim();
    const imageFile = parentCommentId ? replyImageFile : commentImageFile;
    if (!body && !imageFile) return;
    setSubmittingComment(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const url = await uploadCommentImage(imageFile);
        if (url) image_url = url;
        else {
          setSubmittingComment(false);
          return;
        }
      }

      const res = await fetch(`/api/community/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body || '', parent_comment_id: parentCommentId, image_url }),
      });
      if (res.ok) {
        const data = await res.json();
        const newComment: CommunityProposalComment = {
          ...data.comment,
          member_name: session?.user?.name || 'Me',
          member_avatar_url: currentMemberAvatarUrl || session?.user?.image || undefined,
          reactions: { like: 0, heart: 0, haha: 0, wow: 0, sad: 0, cold: 0, fire: 0, hug: 0, highfive: 0 },
          replies: [],
        };
        if (!currentMemberId && newComment.member_id) {
          setCurrentMemberId(newComment.member_id);
        }

        if (parentCommentId) {
          setReplyBody('');
          setReplyingTo(null);
          clearCommentImage(true);
          setComments(prev => prev.map(c =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          ));
        } else {
          setCommentText('');
          clearCommentImage(false);
          setComments(prev => [...prev, newComment]);
        }
      }
    } catch {} finally {
      setSubmittingComment(false);
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editBody.trim()) return;
    const newBody = editBody.trim();
    setEditingComment(null);
    setEditBody('');

    const updateBody = (list: CommunityProposalComment[]): CommunityProposalComment[] =>
      list.map(c => c.id === commentId
        ? { ...c, body: newBody }
        : { ...c, replies: c.replies ? updateBody(c.replies) : [] }
      );
    setComments(prev => updateBody(prev));

    try {
      await fetch(`/api/community/proposals/${proposalId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
    } catch {}
  }

  async function handleDeleteComment(commentId: string) {
    setComments(prev => prev
      .filter(c => c.id !== commentId)
      .map(c => ({ ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }))
    );

    try {
      await fetch(`/api/community/proposals/${proposalId}/comments/${commentId}`, {
        method: 'DELETE',
      });
    } catch {}
  }

  function startEditing() {
    if (!proposal) return;
    setEditTitle(proposal.title);
    setEditDescription(proposal.description);
    setEditCategory(proposal.category);
    setEditGenre(proposal.genre || 'other');
    setEditTargetDate(proposal.target_date || '');
    setEditError(null);
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!proposal) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          genre: editGenre,
          target_date: editTargetDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || 'Failed to save');
        return;
      }
      const data = await res.json();
      setProposal({ ...proposal, ...data.proposal });
      setIsEditing(false);
    } catch {
      setEditError('Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-2/3" /><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-32 bg-gray-200 rounded" /></div>;
  }

  if (!proposal) return null;

  const isTerminal = ['completed', 'archived', 'removed'].includes(proposal.status);
  const isAuthor = currentMemberId === proposal.created_by_member_id;
  const canEdit = (isAuthor && (proposal.commitment_count || 0) <= 1 && !isTerminal) || currentMemberIsAdmin;

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
          <span className="text-2xl">{CATEGORY_ICONS[isEditing ? editCategory : proposal.category]}</span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[proposal.status]}`}>
            {(STATUS_LABELS[proposal.status] || { en: proposal.status, vi: proposal.status })[locale === 'vi' ? 'vi' : 'en']}
          </span>
          {proposal.is_pinned && <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">📌 Pinned</span>}
          {canEdit && !isEditing && (
            <button
              onClick={startEditing}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {locale === 'vi' ? 'Chỉnh sửa' : 'Edit'}
            </button>
          )}
          {isEditing && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                disabled={savingEdit}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded-lg border border-gray-300"
              >
                {locale === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium px-3 py-1 rounded-lg disabled:opacity-50"
              >
                {savingEdit ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...') : (locale === 'vi' ? 'Lưu' : 'Save')}
              </button>
            </div>
          )}
        </div>
        {editError && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</div>
        )}
        {isEditing ? (
          <>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="text-3xl font-bold text-gray-900 mb-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={locale === 'vi' ? 'Tên hoạt động' : 'Proposal title'}
            />
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <label className="text-sm text-gray-600 flex items-center gap-1">
                {locale === 'vi' ? 'Danh mục' : 'Category'}:
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="ml-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PROPOSAL_CATEGORY_LABELS).map(([key, labels]) => (
                    <option key={key} value={key}>{labels[locale === 'vi' ? 'vi' : 'en']}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                {locale === 'vi' ? 'Chủ đề' : 'Topic'}:
                <select
                  value={editGenre}
                  onChange={e => setEditGenre(e.target.value)}
                  className="ml-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PROPOSAL_GENRE_LABELS).map(([key, labels]) => (
                    <option key={key} value={key}>{labels.icon} {labels[locale === 'vi' ? 'vi' : 'en']}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                {locale === 'vi' ? 'Ngày mục tiêu' : 'Target date'}:
                <input
                  type="date"
                  value={editTargetDate}
                  onChange={e => setEditTargetDate(e.target.value)}
                  className="ml-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{proposal.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-gray-600">
              <span>
                {locale === 'vi' ? 'bởi' : 'by'} {proposal.author_name || 'Unknown'}
                {proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
                {proposal.target_date ? ` · ${locale === 'vi' ? 'Mục tiêu' : 'Target'}: ${proposal.target_date}` : ''}
              </span>
              {proposal.genre && proposal.genre !== 'other' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {PROPOSAL_GENRE_LABELS[proposal.genre]?.icon} {PROPOSAL_GENRE_LABELS[proposal.genre]?.[locale === 'vi' ? 'vi' : 'en']}
                </span>
              )}
            </div>
          </>
        )}
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
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            rows={12}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder={locale === 'vi' ? 'Mô tả hoạt động (hỗ trợ Markdown)' : 'Proposal description (Markdown supported)'}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>{linkifyText(proposal.description)}</ReactMarkdown></div>
        )}
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
                {c.member_avatar_url ? (
                  <img src={c.member_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${getAvatarColor(c.member_name || '?')}`}>
                    {(c.member_name || '?')[0].toUpperCase()}
                  </div>
                )}
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
            <div className="rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={locale === 'vi' ? 'Viết bình luận...' : 'Write a comment...'}
                className="w-full px-4 py-2.5 border-0 rounded-t-lg focus:ring-0 focus:outline-none min-h-[80px]"
                maxLength={2000}
              />
              {commentImagePreview && (
                <div className="relative mx-4 mb-2 inline-block">
                  <img src={commentImagePreview} alt="Preview" className="max-h-32 rounded-lg border border-gray-200 object-cover" />
                  <button type="button" onClick={() => clearCommentImage(false)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600">&times;</button>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-gray-100 px-3 py-1.5">
                <div className="relative flex items-center gap-0.5">
                  <input ref={commentImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleCommentImageSelect(e)} />
                  <button type="button" onClick={() => commentImageRef.current?.click()} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={locale === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" /></svg>
                  </button>
                  <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === 'main' ? null : 'main')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Emoji">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                  </button>
                  {showEmojiPicker === 'main' && (
                    <div className="absolute bottom-full left-0 z-10 mb-1 grid w-64 grid-cols-10 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                      {EMOJI_LIST.map((e) => (
                        <button key={e} type="button" onClick={() => insertEmoji(e)} className="rounded p-1 text-lg hover:bg-gray-100">{e}</button>
                      ))}
                    </div>
                  )}
                  <span className="ml-1 text-xs text-gray-400">{commentText.length}/2000</span>
                </div>
                <button
                  type="submit"
                  disabled={(!commentText.trim() && !commentImageFile) || submittingComment}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingComment ? '...' : (locale === 'vi' ? 'Gửi' : 'Post')}
                </button>
              </div>
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
            <div key={c.id}>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                {editingComment === c.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      maxLength={2000}
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2 justify-end">
                      <button onClick={() => setEditingComment(null)} className="text-xs text-gray-500 px-3 py-1">
                        {locale === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleEditComment(c.id)}
                        disabled={!editBody.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {locale === 'vi' ? 'Lưu' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{c.body}</p>
                    {c.image_url && (
                      <a href={c.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        <img src={c.image_url} alt="" className="max-h-60 rounded-lg border border-gray-200 object-cover" />
                      </a>
                    )}
                  </>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <CommentReactions
                    commentId={c.id}
                    commentType="proposal"
                    entityId={proposalId}
                    reactions={c.reactions}
                    onReactionChange={() => void fetchProposal(true)}
                  />
                  {session && (
                    <button
                      onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyBody(''); }}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {locale === 'vi' ? 'Trả lời' : 'Reply'}
                    </button>
                  )}
                  {currentMemberId === c.member_id && (
                    <>
                      <button
                        onClick={() => { setEditingComment(c.id); setEditBody(c.body); }}
                        className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {locale === 'vi' ? 'Sửa' : 'Edit'}
                      </button>
                      <button
                        onClick={() => { if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) handleDeleteComment(c.id); }}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                      >
                        {locale === 'vi' ? 'Xóa' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {reply.member_avatar_url ? (
                          <img src={reply.member_avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${getAvatarColor(reply.member_name || '?')}`}>
                            {(reply.member_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-sm text-gray-900">{reply.member_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{timeAgo(reply.created_at, locale || 'vi')}</span>
                      </div>
                      {editingComment === reply.id ? (
                        <div className="mt-1">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            maxLength={2000}
                            autoFocus
                          />
                          <div className="mt-1 flex gap-2 justify-end">
                            <button onClick={() => setEditingComment(null)} className="text-xs text-gray-500 px-2 py-1">{locale === 'vi' ? 'Hủy' : 'Cancel'}</button>
                            <button onClick={() => handleEditComment(reply.id)} disabled={!editBody.trim()} className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">{locale === 'vi' ? 'Lưu' : 'Save'}</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{reply.body}</p>
                          {reply.image_url && (
                            <a href={reply.image_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
                              <img src={reply.image_url} alt="" className="max-h-48 rounded-lg border border-gray-200 object-cover" />
                            </a>
                          )}
                        </>
                      )}
                      <div className="mt-1 flex items-center gap-3">
                        <CommentReactions
                          commentId={reply.id}
                          commentType="proposal"
                          entityId={proposalId}
                          reactions={reply.reactions}
                        />
                        {currentMemberId === reply.member_id && (
                          <>
                            <button onClick={() => { setEditingComment(reply.id); setEditBody(reply.body); }} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">{locale === 'vi' ? 'Sửa' : 'Edit'}</button>
                            <button onClick={() => { if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) handleDeleteComment(reply.id); }} className="text-xs text-gray-400 hover:text-red-600 transition-colors">{locale === 'vi' ? 'Xóa' : 'Delete'}</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === c.id && (
                <form onSubmit={(e) => handleComment(e, c.id)} className="ml-8 mt-2 pl-4">
                  <div className="rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={locale === 'vi' ? 'Viết trả lời...' : 'Write a reply...'}
                      className="w-full px-3 py-2 border-0 rounded-t-lg text-sm focus:ring-0 focus:outline-none min-h-[60px]"
                      maxLength={2000}
                      autoFocus
                    />
                    {replyImagePreview && (
                      <div className="relative mx-3 mb-2 inline-block">
                        <img src={replyImagePreview} alt="Preview" className="max-h-24 rounded-lg border border-gray-200 object-cover" />
                        <button type="button" onClick={() => clearCommentImage(true)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600">&times;</button>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1">
                      <div className="relative flex items-center gap-0.5">
                        <input ref={replyImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleCommentImageSelect(e, true)} />
                        <button type="button" onClick={() => replyImageRef.current?.click()} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={locale === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" /></svg>
                        </button>
                        <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === 'reply' ? null : 'reply')} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Emoji">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                        </button>
                        {showEmojiPicker === 'reply' && (
                          <div className="absolute bottom-full left-0 z-10 mb-1 grid w-56 grid-cols-10 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                            {EMOJI_LIST.map((e) => (
                              <button key={e} type="button" onClick={() => insertEmoji(e, true)} className="rounded p-0.5 text-base hover:bg-gray-100">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(null); setReplyBody(''); clearCommentImage(true); setShowEmojiPicker(null); }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        >
                          {locale === 'vi' ? 'Hủy' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={(!replyBody.trim() && !replyImageFile) || submittingComment}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
                        >
                          {locale === 'vi' ? 'Gửi' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
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
