'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { linkifyText } from '@/lib/linkify';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, CommunityCommitment, CommunityProposalComment, CommitmentLevel, ParticipationFormat, ProposalDiscussion, DiscussionResponse, ProposalPoll, PollResponse, COMMITMENT_LABELS, COMMITMENT_WEIGHTS, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS, PARTICIPATION_FORMAT_LABELS } from '@/types';
import { ProposalDiscussionSection } from '@/components/proposals/proposal-discussion-section';
import { ProposalPollSection } from '@/components/proposals/proposal-poll-section';
import { CommentReactions } from '@/components/ui/comment-reactions';
import { MentionTextarea, renderMentions, encodementions, decodeMentions } from '@/components/ui/mention-textarea';

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
  const [editMentions, setEditMentions] = useState<{ name: string; id: string }[]>([]);
  const [submittingCommitment, setSubmittingCommitment] = useState(false);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCustomLocation, setEditCustomLocation] = useState('');
  const [editParticipationFormat, setEditParticipationFormat] = useState<ParticipationFormat>('offline');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editHasDiscussion, setEditHasDiscussion] = useState(false);
  const [editDiscussionTitle, setEditDiscussionTitle] = useState('');
  const [editDiscussionDescription, setEditDiscussionDescription] = useState('');
  const [editDiscussionOptions, setEditDiscussionOptions] = useState<{date: string; startTime: string; endTime: string}[]>([
    { date: '', startTime: '', endTime: '' },
    { date: '', startTime: '', endTime: '' },
  ]);
  const [editHasPoll, setEditHasPoll] = useState(false);
  const [editPollTitle, setEditPollTitle] = useState('');
  const [editPollDescription, setEditPollDescription] = useState('');
  const [editPollOptions, setEditPollOptions] = useState<string[]>(['', '']);
  const [editPollAllowMultiple, setEditPollAllowMultiple] = useState(false);
  // Activity-type-specific edit fields
  const [editDuration, setEditDuration] = useState('');
  const [editCustomDuration, setEditCustomDuration] = useState('');
  const [editAgenda, setEditAgenda] = useState('');
  const [editGeneratingAgenda, setEditGeneratingAgenda] = useState(false);
  const [editHasFee, setEditHasFee] = useState<boolean | null>(null);
  const [editEstimatedFee, setEditEstimatedFee] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editRegistrationInfo, setEditRegistrationInfo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [rerunningAI, setRerunningAI] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [discussion, setDiscussion] = useState<ProposalDiscussion | null>(null);
  const [discussionResponses, setDiscussionResponses] = useState<DiscussionResponse[]>([]);
  const [poll, setPoll] = useState<ProposalPoll | null>(null);
  const [pollResponses, setPollResponses] = useState<PollResponse[]>([]);
  const [deleting, setDeleting] = useState(false);
  // Recap state
  const [recapText, setRecapText] = useState('');
  const [recapImages, setRecapImages] = useState<string[]>([]);
  const [recapImageUploading, setRecapImageUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const recapImageRef = useRef<HTMLInputElement>(null);
  const commentImageRef = useRef<HTMLInputElement>(null);
  const replyImageRef = useRef<HTMLInputElement>(null);
  const commentMentionsRef = useRef<{ name: string; id: string }[]>([]);
  const replyMentionsRef = useRef<{ name: string; id: string }[]>([]);

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
      // Discussion data
      if (data.discussion) {
        setDiscussion(data.discussion);
        setDiscussionResponses((data.discussionResponses || []).map((r: Record<string, unknown>) => {
          const member = r.members as Record<string, unknown> | null;
          return {
            ...r,
            member_name: member?.name || r.member_name,
            member_email: member?.email || r.member_email,
            member_avatar_url: member?.avatar_url || r.member_avatar_url,
            member_public_profile_slug: member?.public_profile_slug || r.member_public_profile_slug,
          };
        }));
      }
      // Poll data
      if (data.poll) {
        setPoll(data.poll);
        setPollResponses((data.pollResponses || []).map((r: Record<string, unknown>) => {
          const member = r.members as Record<string, unknown> | null;
          return {
            ...r,
            member_name: member?.name || r.member_name,
            member_avatar_url: member?.avatar_url || r.member_avatar_url,
          };
        }));
      }
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
    const rawBody = parentCommentId ? replyBody.trim() : commentText.trim();
    const mentions = parentCommentId ? replyMentionsRef.current : commentMentionsRef.current;
    const body = mentions.length > 0 ? encodementions(rawBody, mentions) : rawBody;
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
          replyMentionsRef.current = [];
          setComments(prev => prev.map(c =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          ));
        } else {
          setCommentText('');
          clearCommentImage(false);
          commentMentionsRef.current = [];
          setComments(prev => [...prev, newComment]);
        }
      }
    } catch {} finally {
      setSubmittingComment(false);
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editBody.trim()) return;
    const newBody = encodementions(editBody.trim(), editMentions);
    setEditingComment(null);
    setEditBody('');
    setEditMentions([]);

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

  async function handleRecapImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecapImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/community/proposals/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setRecapImages(prev => [...prev, data.data.url]);
      }
    } catch {} finally {
      setRecapImageUploading(false);
      if (recapImageRef.current) recapImageRef.current.value = '';
    }
  }

  function startEditing() {
    if (!proposal) return;
    setRecapText(proposal.recap_text || '');
    setRecapImages(proposal.recap_images || []);
    setEditTitle(proposal.title);
    setEditDescription(proposal.description);
    setEditCategory(proposal.category);
    setEditGenre(proposal.genre || 'other');
    setEditTargetDate(proposal.target_date || '');
    const loc = proposal.location || '';
    if (loc === 'Hà Nội' || loc === 'HCM' || loc === '') {
      setEditLocation(loc);
      setEditCustomLocation('');
    } else {
      setEditLocation('__custom__');
      setEditCustomLocation(loc);
    }
    setEditParticipationFormat((proposal.participation_format as ParticipationFormat) || 'offline');
    setEditTags(proposal.tags || []);
    setEditTagInput('');
    setEditHasDiscussion(!!proposal.has_discussion);
    setEditDiscussionTitle(discussion?.title || '');
    setEditDiscussionDescription(discussion?.description || '');
    // Pre-populate from existing discussion options if available
    if (discussion && discussion.date_options.length > 0) {
      setEditDiscussionOptions(discussion.date_options.map(opt => {
        const timeMatch = opt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})-(\d{2}:\d{2})$/);
        if (timeMatch) return { date: timeMatch[1], startTime: timeMatch[2], endTime: timeMatch[3] };
        return { date: opt, startTime: '', endTime: '' };
      }));
    } else {
      setEditDiscussionOptions([
        { date: '', startTime: '', endTime: '' },
        { date: '', startTime: '', endTime: '' },
      ]);
    }
    // Pre-populate freestyle poll
    setEditHasPoll(!!proposal.has_poll);
    setEditPollTitle(poll?.title || '');
    setEditPollDescription(poll?.description || '');
    setEditPollOptions(poll?.options?.length ? [...poll.options] : ['', '']);
    setEditPollAllowMultiple(poll?.allow_multiple || false);
    // Activity-type-specific fields
    const dur = proposal.duration || '';
    const durationPresets = ['1 giờ', '2 giờ', '3 giờ', 'Nửa ngày', 'Cả ngày'];
    if (durationPresets.includes(dur)) {
      setEditDuration(dur);
      setEditCustomDuration('');
    } else if (dur) {
      setEditDuration('__custom__');
      setEditCustomDuration(dur);
    } else {
      setEditDuration('');
      setEditCustomDuration('');
    }
    setEditAgenda(proposal.agenda || '');
    setEditHasFee(proposal.has_fee !== undefined && proposal.has_fee !== null ? proposal.has_fee : null);
    setEditEstimatedFee(proposal.estimated_fee || '');
    setEditRequirements(proposal.requirements || '');
    setEditRegistrationInfo(proposal.registration_info || '');
    setEditError(null);
    setIsEditing(true);
  }

  // Check for duplicate discussion date options
  const discussionDuplicates = (() => {
    if (!editHasDiscussion) return false;
    const keys = editDiscussionOptions
      .filter(o => o.date)
      .map(o => o.startTime && o.endTime ? `${o.date}T${o.startTime}-${o.endTime}` : o.date);
    return keys.length !== new Set(keys).size;
  })();

  // Check for duplicate freestyle poll options
  const pollDuplicates = (() => {
    if (!editHasPoll) return false;
    const opts = editPollOptions.filter(o => o.trim()).map(o => o.trim().toLowerCase());
    return opts.length !== new Set(opts).size;
  })();

  async function handleSaveEdit() {
    if (!proposal) return;
    if (discussionDuplicates || pollDuplicates) {
      setEditError(locale === 'vi' ? 'Không được có lựa chọn trùng lặp trong poll.' : 'Poll options must not have duplicates.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      // Save recap separately (API handles recap in a separate branch)
      const recapChanged = recapText !== (proposal.recap_text || '') || JSON.stringify(recapImages) !== JSON.stringify(proposal.recap_images || []);
      if (recapChanged) {
        await fetch(`/api/community/proposals/${proposalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recap_text: recapText, recap_images: recapImages }),
        });
      }

      const res = await fetch(`/api/community/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          genre: editGenre,
          target_date: editTargetDate || null,
          location: editLocation === '__custom__' ? editCustomLocation.trim() : editLocation || null,
          participation_format: editParticipationFormat,
          tags: editTags,
          has_discussion: editHasDiscussion,
          discussion_title: editHasDiscussion ? editDiscussionTitle.trim() || undefined : undefined,
          discussion_description: editHasDiscussion ? editDiscussionDescription.trim() || undefined : undefined,
          discussion_date_options: editHasDiscussion ? editDiscussionOptions
            .filter(o => o.date)
            .map(o => o.startTime && o.endTime ? `${o.date}T${o.startTime}-${o.endTime}` : o.date)
            : undefined,
          has_poll: editHasPoll,
          poll_title: editHasPoll ? editPollTitle.trim() : undefined,
          poll_description: editHasPoll ? editPollDescription.trim() || undefined : undefined,
          poll_options: editHasPoll ? editPollOptions.filter(o => o.trim()) : undefined,
          poll_allow_multiple: editHasPoll ? editPollAllowMultiple : undefined,
          // Activity-type-specific fields
          duration: (editDuration === '__custom__' ? editCustomDuration.trim() : editDuration) || null,
          agenda: editAgenda.trim() || null,
          has_fee: editHasFee,
          estimated_fee: editEstimatedFee.trim() || null,
          requirements: editRequirements.trim() || null,
          registration_info: editRegistrationInfo.trim() || null,
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
      // Reload to refresh discussion/poll data if created or edited
      if (editHasDiscussion || editHasPoll) {
        window.location.reload();
        return;
      }
    } catch {
      setEditError('Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRerunAI() {
    if (!editTitle || !editDescription) return;
    setRerunningAI(true);
    setEditError(null);
    try {
      const res = await fetch('/api/community/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, category: editCategory, what: editDescription }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.description) setEditDescription(data.description);
        if (data.category && ['talk', 'learning', 'fieldtrip', 'meeting', 'sports', 'community_support'].includes(data.category)) setEditCategory(data.category);
        if (data.genre && ['education', 'health', 'finance', 'technology', 'business', 'culture', 'environment', 'other'].includes(data.genre)) setEditGenre(data.genre);
        if (data.location) {
          if (data.location === 'Hà Nội' || data.location === 'HCM') {
            setEditLocation(data.location);
            setEditCustomLocation('');
          } else {
            setEditLocation('__custom__');
            setEditCustomLocation(data.location);
          }
        }
        if (data.participation_format && ['online', 'offline', 'hybrid'].includes(data.participation_format)) setEditParticipationFormat(data.participation_format);
        if (Array.isArray(data.tags)) setEditTags(data.tags);
      } else {
        setEditError(data.error || 'AI generation failed');
      }
    } catch {
      setEditError('Failed to rerun AI');
    } finally {
      setRerunningAI(false);
    }
  }

  async function handleDeleteProposal() {
    const msg = locale === 'vi'
      ? 'Bạn có chắc muốn xóa đề xuất này? Hành động này không thể hoàn tác.'
      : 'Are you sure you want to delete this proposal? This action cannot be undone.';
    if (!confirm(msg)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || (locale === 'vi' ? 'Không thể xóa đề xuất' : 'Failed to delete proposal'));
        return;
      }
      router.push('/events?tab=proposals');
    } catch {
      alert(locale === 'vi' ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setDeleting(false);
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
                onClick={handleRerunAI}
                disabled={rerunningAI || savingEdit}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg border border-blue-300 bg-blue-50 disabled:opacity-50 flex items-center gap-1"
              >
                {rerunningAI ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {locale === 'vi' ? 'AI đang xử lý...' : 'AI processing...'}
                  </>
                ) : (
                  <>{locale === 'vi' ? '✨ Rerun AI' : '✨ Rerun AI'}</>
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={savingEdit || rerunningAI}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded-lg border border-gray-300"
              >
                {locale === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || rerunningAI}
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

            {/* Location + Format row */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <label className="text-sm text-gray-600 flex items-center gap-1">
                {locale === 'vi' ? 'Địa điểm' : 'Location'}:
                <select
                  value={editLocation}
                  onChange={e => { setEditLocation(e.target.value); if (e.target.value !== '__custom__') setEditCustomLocation(''); }}
                  className="ml-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{locale === 'vi' ? '-- Chọn --' : '-- Select --'}</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="HCM">HCM</option>
                  <option value="__custom__">{locale === 'vi' ? 'Khác...' : 'Other...'}</option>
                </select>
              </label>
              {editLocation === '__custom__' && (
                <input
                  type="text"
                  value={editCustomLocation}
                  onChange={e => setEditCustomLocation(e.target.value)}
                  placeholder={locale === 'vi' ? 'Nhập địa điểm...' : 'Enter location...'}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                />
              )}
              <label className="text-sm text-gray-600 flex items-center gap-1">
                {locale === 'vi' ? 'Hình thức' : 'Format'}:
                <select
                  value={editParticipationFormat}
                  onChange={e => setEditParticipationFormat(e.target.value as ParticipationFormat)}
                  className="ml-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(['offline', 'online', 'hybrid'] as ParticipationFormat[]).map(fmt => (
                    <option key={fmt} value={fmt}>{PARTICIPATION_FORMAT_LABELS[fmt].icon} {PARTICIPATION_FORMAT_LABELS[fmt][locale === 'vi' ? 'vi' : 'en']}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Activity-type-specific fields */}
            {editCategory && editCategory !== 'other' && (
              <div className="mt-4 border-2 border-blue-100 rounded-lg p-4 space-y-4">
                <p className="text-sm font-semibold text-blue-700">
                  {locale === 'vi' ? 'Thông tin theo loại hoạt động' : 'Activity-type fields'}
                </p>

                {/* Duration */}
                {['coffee', 'fieldtrip', 'sports', 'community_support', 'talk'].includes(editCategory) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {locale === 'vi' ? 'Thời lượng' : 'Duration'} *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '1 giờ', label: '1 giờ' },
                        { value: '2 giờ', label: '2 giờ' },
                        { value: '3 giờ', label: '3 giờ' },
                        { value: 'Nửa ngày', label: locale === 'vi' ? 'Nửa ngày' : 'Half day' },
                        { value: 'Cả ngày', label: locale === 'vi' ? 'Cả ngày' : 'Full day' },
                      ].map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => { setEditDuration(d.value); setEditCustomDuration(''); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            editDuration === d.value
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditDuration('__custom__')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          editDuration === '__custom__'
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        ✏️ {locale === 'vi' ? 'Khác' : 'Other'}
                      </button>
                    </div>
                    {editDuration === '__custom__' && (
                      <input
                        type="text"
                        value={editCustomDuration}
                        onChange={e => setEditCustomDuration(e.target.value)}
                        placeholder={locale === 'vi' ? 'VD: 4 tiếng, 2 ngày 1 đêm...' : 'e.g. 4 hours, 2 days...'}
                        className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={100}
                      />
                    )}
                  </div>
                )}

                {/* Agenda */}
                {['fieldtrip', 'sports', 'community_support', 'talk'].includes(editCategory) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {locale === 'vi'
                        ? (editCategory === 'community_support' ? 'Chương trình / Mô tả công việc' : 'Chương trình / Agenda')
                        : (editCategory === 'community_support' ? 'Agenda / Task description' : 'Agenda')} *
                    </label>
                    <textarea
                      value={editAgenda}
                      onChange={e => setEditAgenda(e.target.value)}
                      placeholder={locale === 'vi'
                        ? 'VD:\n08:00 - Tập trung\n08:30 - Khởi hành\n10:00 - Hoạt động chính'
                        : 'e.g.\n08:00 - Gathering\n08:30 - Departure\n10:00 - Main activity'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editTitle || !editDescription) return;
                        setEditGeneratingAgenda(true);
                        try {
                          const res = await fetch('/api/community/proposals/generate-agenda', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: editTitle,
                              category: editCategory,
                              description: editDescription,
                              location: editLocation === '__custom__' ? editCustomLocation : editLocation,
                              duration: editDuration === '__custom__' ? editCustomDuration : editDuration,
                              timeSlots: editHasDiscussion ? editDiscussionOptions.filter(o => o.date && o.startTime && o.endTime) : [],
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.agenda) setEditAgenda(data.agenda);
                        } catch { /* ignore */ } finally {
                          setEditGeneratingAgenda(false);
                        }
                      }}
                      disabled={editGeneratingAgenda || !editTitle || !editDescription}
                      className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {editGeneratingAgenda ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          {locale === 'vi' ? 'AI đang tạo...' : 'AI generating...'}
                        </>
                      ) : (
                        <>{editAgenda ? '🔄' : '✨'} {locale === 'vi' ? (editAgenda ? 'Tạo lại bằng AI' : 'Tạo bằng AI') : (editAgenda ? 'Regenerate with AI' : 'Generate with AI')}</>
                      )}
                    </button>
                  </div>
                )}

                {/* Fee */}
                {['fieldtrip', 'sports'].includes(editCategory) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      {locale === 'vi' ? 'Chi phí tham gia' : 'Participation fee'} *
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => { setEditHasFee(false); setEditEstimatedFee(''); }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          editHasFee === false
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-green-300 bg-white'
                        }`}
                      >
                        {locale === 'vi' ? '🆓 Miễn phí' : '🆓 No Fee'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditHasFee(true)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          editHasFee === true
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-orange-300 bg-white'
                        }`}
                      >
                        {locale === 'vi' ? '💰 Có phí' : '💰 Has Fee'}
                      </button>
                    </div>
                    {editHasFee === true && (
                      <input
                        type="text"
                        value={editEstimatedFee}
                        onChange={e => setEditEstimatedFee(e.target.value)}
                        placeholder={locale === 'vi' ? 'Chi phí ước tính (tùy chọn), VD: 200.000 VNĐ / người' : 'Estimated fee (optional)'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={200}
                      />
                    )}
                  </div>
                )}

                {/* Requirements (Community Support) */}
                {editCategory === 'community_support' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {locale === 'vi' ? 'Yêu cầu đối với người tham gia' : 'Requirements for participants'} *
                    </label>
                    <textarea
                      value={editRequirements}
                      onChange={e => setEditRequirements(e.target.value)}
                      placeholder={locale === 'vi' ? 'VD: Có tinh thần tình nguyện, mang giày thể thao...' : 'e.g. Volunteer spirit, bring sport shoes...'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    />
                  </div>
                )}

                {/* Registration Info (Community Support) */}
                {editCategory === 'community_support' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {locale === 'vi' ? 'Cách đăng ký tham gia' : 'How to register'} *
                    </label>
                    <textarea
                      value={editRegistrationInfo}
                      onChange={e => setEditRegistrationInfo(e.target.value)}
                      placeholder={locale === 'vi' ? 'VD: Đăng ký qua Google Form: [link]...' : 'e.g. Register via Google Form: [link]...'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Discussion toggle */}
            <div className="mt-4 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editHasDiscussion}
                  onChange={e => setEditHasDiscussion(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {locale === 'vi' ? '📅 Thảo luận trực tuyến (Poll ngày)' : '📅 Online Discussion (Date Poll)'}
                  </span>
                  {proposal.has_discussion && (
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      {locale === 'vi' ? '✓ Đã bật' : '✓ Enabled'}
                    </span>
                  )}
                </div>
              </label>
              {editHasDiscussion && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={editDiscussionTitle}
                    onChange={e => setEditDiscussionTitle(e.target.value)}
                    placeholder={locale === 'vi' ? 'Tiêu đề poll (tùy chọn)' : 'Poll title (optional)'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={200}
                  />
                  <input
                    type="text"
                    value={editDiscussionDescription}
                    onChange={e => setEditDiscussionDescription(e.target.value)}
                    placeholder={locale === 'vi' ? 'Mô tả (tùy chọn)' : 'Description (optional)'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1000}
                  />
                  {proposal.has_discussion && discussionResponses.length > 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {locale === 'vi'
                        ? `⚠️ Đã có ${discussionResponses.length} phản hồi. Thay đổi lựa chọn sẽ xóa tất cả phiếu bầu hiện tại.`
                        : `⚠️ ${discussionResponses.length} response(s) exist. Changing options will erase all current votes.`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {locale === 'vi' ? 'Đề xuất 2-10 lựa chọn ngày/giờ để mọi người bình chọn:' : 'Propose 2-10 date/time options for members to vote:'}
                  </p>
                  {editDiscussionOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => {
                            const updated = [...editDiscussionOptions];
                            [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                            setEditDiscussionOptions(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title={locale === 'vi' ? 'Di chuyển lên' : 'Move up'}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={i === editDiscussionOptions.length - 1}
                          onClick={() => {
                            const updated = [...editDiscussionOptions];
                            [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                            setEditDiscussionOptions(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title={locale === 'vi' ? 'Di chuyển xuống' : 'Move down'}
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        type="date"
                        value={opt.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => {
                          const updated = [...editDiscussionOptions];
                          updated[i] = { ...updated[i], date: e.target.value };
                          setEditDiscussionOptions(updated);
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="time"
                        value={opt.startTime}
                        onChange={e => {
                          const updated = [...editDiscussionOptions];
                          updated[i] = { ...updated[i], startTime: e.target.value };
                          setEditDiscussionOptions(updated);
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                      />
                      <span className="text-gray-400 text-xs">-</span>
                      <input
                        type="time"
                        value={opt.endTime}
                        onChange={e => {
                          const updated = [...editDiscussionOptions];
                          updated[i] = { ...updated[i], endTime: e.target.value };
                          setEditDiscussionOptions(updated);
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
                      />
                      {editDiscussionOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setEditDiscussionOptions(editDiscussionOptions.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >✕</button>
                      )}
                    </div>
                  ))}
                  {editDiscussionOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setEditDiscussionOptions([...editDiscussionOptions, { date: '', startTime: '', endTime: '' }])}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + {locale === 'vi' ? 'Thêm lựa chọn' : 'Add option'}
                    </button>
                  )}
                  {discussionDuplicates && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {locale === 'vi' ? '⚠️ Có lựa chọn ngày/giờ bị trùng lặp.' : '⚠️ Duplicate date/time options found.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Freestyle Poll toggle */}
            <div className="mt-4 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editHasPoll}
                  onChange={e => setEditHasPoll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {locale === 'vi' ? '📊 Bình chọn tự do (Poll)' : '📊 Freestyle Poll'}
                  </span>
                  {proposal.has_poll && (
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      {locale === 'vi' ? '✓ Đã bật' : '✓ Enabled'}
                    </span>
                  )}
                </div>
              </label>
              {editHasPoll && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={editPollTitle}
                    onChange={e => setEditPollTitle(e.target.value)}
                    placeholder={locale === 'vi' ? 'Tiêu đề bình chọn *' : 'Poll title *'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={200}
                  />
                  <input
                    type="text"
                    value={editPollDescription}
                    onChange={e => setEditPollDescription(e.target.value)}
                    placeholder={locale === 'vi' ? 'Mô tả (tùy chọn)' : 'Description (optional)'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1000}
                  />
                  {proposal.has_poll && pollResponses.length > 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {locale === 'vi'
                        ? `⚠️ Đã có ${pollResponses.length} phiếu bầu. Thay đổi lựa chọn sẽ xóa tất cả phiếu bầu hiện tại.`
                        : `⚠️ ${pollResponses.length} vote(s) exist. Changing options will erase all current votes.`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {locale === 'vi' ? 'Thêm 2-20 lựa chọn:' : 'Add 2-20 options:'}
                  </p>
                  {editPollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => {
                            const updated = [...editPollOptions];
                            [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                            setEditPollOptions(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title={locale === 'vi' ? 'Di chuyển lên' : 'Move up'}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={i === editPollOptions.length - 1}
                          onClick={() => {
                            const updated = [...editPollOptions];
                            [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                            setEditPollOptions(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title={locale === 'vi' ? 'Di chuyển xuống' : 'Move down'}
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const updated = [...editPollOptions];
                          updated[i] = e.target.value;
                          setEditPollOptions(updated);
                        }}
                        placeholder={`${locale === 'vi' ? 'Lựa chọn' : 'Option'} ${i + 1}`}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={200}
                      />
                      {editPollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setEditPollOptions(editPollOptions.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >✕</button>
                      )}
                    </div>
                  ))}
                  {editPollOptions.length < 20 && (
                    <button
                      type="button"
                      onClick={() => setEditPollOptions([...editPollOptions, ''])}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + {locale === 'vi' ? 'Thêm lựa chọn' : 'Add option'}
                    </button>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <input
                      type="checkbox"
                      checked={editPollAllowMultiple}
                      onChange={e => setEditPollAllowMultiple(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {locale === 'vi' ? 'Cho phép chọn nhiều lựa chọn' : 'Allow multiple selections'}
                  </label>
                  {pollDuplicates && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {locale === 'vi' ? '⚠️ Có lựa chọn bị trùng lặp.' : '⚠️ Duplicate options found.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recap editor inside editing view */}
            <div className="mt-4 border border-purple-200 rounded-lg p-4 bg-purple-50/50">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-1.5">
                <span>📸</span> Recap
              </h3>
              <textarea
                value={recapText}
                onChange={e => setRecapText(e.target.value)}
                rows={4}
                className="w-full border border-purple-300 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono mb-3"
                placeholder={locale === 'vi' ? 'Viết recap cho hoạt động này (hỗ trợ Markdown)...' : 'Write a recap for this event (Markdown supported)...'}
                maxLength={5000}
              />
              {recapImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {recapImages.map((url, i) => (
                    <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-purple-200">
                      <img src={url} alt={`Recap ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRecapImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={recapImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleRecapImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => recapImageRef.current?.click()}
                  disabled={recapImageUploading || recapImages.length >= 20}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {recapImageUploading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  )}
                  {locale === 'vi' ? 'Thêm ảnh' : 'Add photo'}
                </button>
                <span className="text-xs text-gray-400">{recapImages.length}/20</span>
              </div>
            </div>

          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{proposal.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-gray-600">
              <span>
                {locale === 'vi' ? 'bởi' : 'by'} {proposal.author_name || 'Unknown'}
                {proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
                {proposal.target_date ? ` · ${locale === 'vi' ? 'Ngày dự kiến' : 'Target date'}: ${proposal.target_date}` : ''}
              </span>
              {proposal.location && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  📍 {proposal.location}
                </span>
              )}
              {proposal.participation_format && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  proposal.participation_format === 'online' ? 'bg-green-100 text-green-700' :
                  proposal.participation_format === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.participation_format}
                </span>
              )}
              {proposal.genre && proposal.genre !== 'other' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {PROPOSAL_GENRE_LABELS[proposal.genre]?.icon} {PROPOSAL_GENRE_LABELS[proposal.genre]?.[locale === 'vi' ? 'vi' : 'en']}
                </span>
              )}
              {proposal.duration && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  ⏱️ {proposal.duration}
                </span>
              )}
              {proposal.has_fee !== undefined && proposal.has_fee !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${proposal.has_fee ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {proposal.has_fee ? `💰 ${proposal.estimated_fee || (locale === 'vi' ? 'Có phí' : 'Has fee')}` : (locale === 'vi' ? '🆓 Miễn phí' : '🆓 Free')}
                </span>
              )}
            </div>

          </>
        )}
      </div>

      {/* Recap Section — read-only display when recap exists and not editing */}
      {!isEditing && (proposal.recap_text || (proposal.recap_images && proposal.recap_images.length > 0)) && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2 mb-4">
            <span className="text-xl">📸</span>
            Recap
          </h2>
          {proposal.recap_text && (
            <div className="prose prose-sm max-w-none text-gray-700 mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} className="text-purple-600 underline hover:text-purple-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>
                {linkifyText(proposal.recap_text)}
              </ReactMarkdown>
            </div>
          )}
          {proposal.recap_images && proposal.recap_images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {proposal.recap_images.map((url, i) => (
                <button key={i} onClick={() => setLightboxImage(url)} className="block aspect-[4/3] rounded-lg overflow-hidden border border-purple-200 hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <img src={url} alt={`Recap ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-10"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Recap"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

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
          <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <p className="mb-3">{children}</p>, a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>{linkifyText(proposal.description)}</ReactMarkdown></div>
        )}

        {/* Activity-type-specific details */}
        {(proposal.agenda || proposal.requirements || proposal.registration_info) && (
          <div className="space-y-4 mt-4">
            {proposal.agenda && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  📋 {locale === 'vi' ? 'Chương trình / Agenda' : 'Agenda'}
                </h3>
                <div className="prose prose-sm max-w-none text-blue-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:mb-1 prose-headings:mt-2"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proposal.agenda}</ReactMarkdown></div>
              </div>
            )}
            {proposal.requirements && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">
                  📝 {locale === 'vi' ? 'Yêu cầu đối với người tham gia' : 'Requirements'}
                </h3>
                <div className="prose prose-sm max-w-none text-amber-800"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proposal.requirements}</ReactMarkdown></div>
              </div>
            )}
            {proposal.registration_info && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">
                  ✍️ {locale === 'vi' ? 'Cách đăng ký' : 'How to register'}
                </h3>
                <div className="prose prose-sm max-w-none text-green-800"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{proposal.registration_info}</ReactMarkdown></div>
              </div>
            )}
          </div>
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

      {/* Online Discussion */}
      {proposal.has_discussion && (
        <ProposalDiscussionSection
          proposalId={proposalId}
          proposalSlug={proposal.slug}
          discussion={discussion}
          responses={discussionResponses}
          commitments={commitments}
          currentMemberId={currentMemberId}
          isCreator={currentMemberId === proposal.created_by_member_id}
          isAdmin={currentMemberIsAdmin}
          locale={locale}
          onRefresh={() => fetchProposal(true)}
        />
      )}

      {/* Freestyle Poll */}
      {proposal.has_poll && (
        <ProposalPollSection
          proposalId={proposalId}
          poll={poll}
          responses={pollResponses}
          currentMemberId={currentMemberId}
          isCreator={currentMemberId === proposal.created_by_member_id}
          locale={locale}
          onRefresh={() => fetchProposal(true)}
        />
      )}

      {/* Comments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {locale === 'vi' ? 'Bình luận' : 'Comments'} ({comments.length})
        </h2>

        {session ? (
          <form onSubmit={handleComment} className="mb-6">
            <div className="rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
              <MentionTextarea
                value={commentText}
                onChange={setCommentText}
                placeholder={locale === 'vi' ? 'Viết bình luận... (gõ @ để tag thành viên)' : 'Write a comment... (type @ to mention)'}
                className="w-full px-4 py-2.5 border-0 rounded-t-lg focus:ring-0 focus:outline-none min-h-[80px]"
                maxLength={2000}
                mentionsRef={commentMentionsRef}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
                  <button
                    type="submit"
                    disabled={(!commentText.trim() && !commentImageFile) || submittingComment}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingComment ? '...' : (locale === 'vi' ? 'Gửi' : 'Post')}
                  </button>
                </div>
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
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{renderMentions(c.body)}</p>
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
                      onClick={() => { if (replyingTo === c.id) { setReplyingTo(null); setReplyBody(''); } else { setReplyingTo(c.id); if (c.member_id !== currentMemberId) { const authorName = c.member_name || 'Member'; setReplyBody(`@${authorName} `); replyMentionsRef.current = [{ name: authorName, id: c.member_id }]; } else { setReplyBody(''); replyMentionsRef.current = []; } } }}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {locale === 'vi' ? 'Trả lời' : 'Reply'}
                    </button>
                  )}
                  {currentMemberId === c.member_id && (
                    <>
                      <button
                        onClick={() => { const { displayText, mentions } = decodeMentions(c.body); setEditingComment(c.id); setEditBody(displayText); setEditMentions(mentions); }}
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
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{renderMentions(reply.body)}</p>
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
                            <button onClick={() => { const { displayText, mentions } = decodeMentions(reply.body); setEditingComment(reply.id); setEditBody(displayText); setEditMentions(mentions); }} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">{locale === 'vi' ? 'Sửa' : 'Edit'}</button>
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
                    <MentionTextarea
                      value={replyBody}
                      onChange={setReplyBody}
                      placeholder={locale === 'vi' ? 'Viết trả lời... (gõ @ để tag)' : 'Write a reply... (type @ to mention)'}
                      className="w-full px-3 py-2 border-0 rounded-t-lg text-sm focus:ring-0 focus:outline-none min-h-[60px]"
                      maxLength={2000}
                      mentionsRef={replyMentionsRef}
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
                        <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
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

      {/* Delete proposal (creator or admin) */}
      {(isAuthor || currentMemberIsAdmin) && !isTerminal && (
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={handleDeleteProposal}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {deleting
              ? (locale === 'vi' ? 'Đang xóa...' : 'Deleting...')
              : (locale === 'vi' ? 'Xóa đề xuất' : 'Delete Proposal')}
          </button>
        </div>
      )}
    </div>
  );
}
