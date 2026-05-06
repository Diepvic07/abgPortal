'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { linkifyText } from '@/lib/linkify';
import { renderMentions } from '@/components/ui/mention-textarea';
import { useTranslation } from '@/lib/i18n';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ToastNotification, useToasts } from '@/components/ui/toast-notification';
import {
  CommunityEvent,
  EventRsvp,
  EventComment,
  CommitmentLevel,
  EventMode,
  EventRegistrationLevel,
  MembershipStatus,
  PayerType,
  EVENT_MODE_LABELS,
  EVENT_CATEGORY_LABELS,
  EVENT_STATUS_LABELS,
} from '@/types';
import { EventPaymentFlow } from './event-payment-flow';
import { EventEmailInviteSection } from './event-email-invite-section';
import { CommentReactions } from '@/components/ui/comment-reactions';

const RSVP_ACTIONS: Array<{
  level: EventRegistrationLevel;
  icon: string;
  label: { en: string; vi: string };
  helper: { en: string; vi: string };
}> = [
  {
    level: 'will_participate',
    icon: '🙌',
    label: { en: 'Join Now', vi: 'Tham gia ngay' },
    helper: {
      en: 'Reserve your spot and receive event updates.',
      vi: 'Giữ chỗ của bạn và nhận cập nhật về sự kiện.',
    },
  },
  {
    level: 'will_lead',
    icon: '👑',
    label: { en: 'Help Organize', vi: 'Chung tay tổ chức' },
    helper: {
      en: 'Volunteer to help host or coordinate this event.',
      vi: 'Tình nguyện hỗ trợ tổ chức hoặc điều phối sự kiện này.',
    },
  },
];

const RSVP_LABELS: Record<EventRegistrationLevel, { en: string; vi: string }> = {
  will_participate: { en: 'Joined', vi: 'Tham gia' },
  will_lead: { en: 'Organizer', vi: 'Tổ chức' },
};

function formatDateTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatEventDateRange(startStr: string, endStr: string | undefined, locale: string): string {
  if (!endStr) return formatDateTime(startStr, locale);
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      const timeStart = start.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
      const timeEnd = end.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
      const datePart = start.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return `${timeStart} – ${timeEnd}, ${datePart}`;
    }
    return `${formatDateTime(startStr, locale)} – ${formatDateTime(endStr, locale)}`;
  } catch {
    return formatDateTime(startStr, locale);
  }
}

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

function formatShortDateTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return `${diffMins}${locale === 'vi' ? ' phút trước' : 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${locale === 'vi' ? ' giờ trước' : 'h ago'}`;
    if (diffDays < 7) return `${diffDays}${locale === 'vi' ? ' ngày trước' : 'd ago'}`;
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function deriveEventMode(event: CommunityEvent): EventMode {
  if (event.event_mode) return event.event_mode;
  if (event.location && event.location_url) return 'hybrid';
  if (event.location_url) return 'online';
  return 'offline';
}

function getModePillClasses(mode: EventMode): string {
  switch (mode) {
    case 'online':
      return 'bg-sky-50 text-sky-700';
    case 'hybrid':
      return 'bg-emerald-50 text-emerald-700';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export function EventDetail({ eventId }: { eventId: string }) {
  const { locale } = useTranslation();
  const { data: session } = useSession();
  const { toasts, showToast, dismissToast } = useToasts();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [myRsvp, setMyRsvp] = useState<CommitmentLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [currentMemberAvatarUrl, setCurrentMemberAvatarUrl] = useState<string | null>(null);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // 'main' | 'reply' | null
  const commentImageRef = useRef<HTMLInputElement>(null);
  const replyImageRef = useRef<HTMLInputElement>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('basic');
  const [pendingRsvp, setPendingRsvp] = useState<EventRegistrationLevel | null>(null);
  const [rsvpNote, setRsvpNote] = useState('');
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [myPaymentStatus, setMyPaymentStatus] = useState<string | null>(null);
  const [memberPhone, setMemberPhone] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [tierCounts, setTierCounts] = useState<{ premium: number; basic: number }>({ premium: 0, basic: 0 });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [currentMemberIsAdmin, setCurrentMemberIsAdmin] = useState(false);
  const fetchEventDataRef = useRef<() => Promise<void>>(async () => {});
  const fetchCommentsDataRef = useRef<() => Promise<void>>(async () => {});

  async function fetchEventData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/events?id=${eventId}`);
      if (!res.ok) {
        setEvent(null);
        setRsvps([]);
        setMyRsvp(null);
        showToast(locale === 'vi' ? 'Không thể tải thông tin sự kiện.' : 'Unable to load event details.');
        return;
      }

      const data = await res.json();
      if (data.event) {
        setEvent(data.event);
        setRsvps(data.rsvps || []);
        setMyRsvp(data.my_rsvp || null);
        setMyPaymentStatus(data.my_payment_status || null);
        if (data.membership_status) setMembershipStatus(data.membership_status);
        if (data.member_phone) setMemberPhone(data.member_phone);
        if (data.tier_counts) setTierCounts(data.tier_counts);
        if (data.currentMemberId) setCurrentMemberId(data.currentMemberId);
        if (data.currentMemberIsAdmin) setCurrentMemberIsAdmin(true);
      } else {
        setEvent(null);
        setRsvps([]);
        setMyRsvp(null);
        setMyPaymentStatus(null);
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      showToast(locale === 'vi' ? 'Không thể tải thông tin sự kiện.' : 'Unable to load event details.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommentsData() {
    try {
      const res = await fetch(`/api/community/events/${eventId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        if (data.currentMemberId) setCurrentMemberId(data.currentMemberId);
        if (data.currentMemberAvatarUrl) setCurrentMemberAvatarUrl(data.currentMemberAvatarUrl);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }

  fetchEventDataRef.current = fetchEventData;
  fetchCommentsDataRef.current = fetchCommentsData;

  useEffect(() => {
    void fetchEventDataRef.current();
  }, [eventId, locale]);

  useEffect(() => {
    void fetchCommentsDataRef.current();
  }, [eventId]);

  async function submitRsvp(level: EventRegistrationLevel) {
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/community/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitment_level: level,
          note: rsvpNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || (locale === 'vi' ? 'Không thể cập nhật đăng ký.' : 'Unable to update RSVP.'));
        return;
      }

      setPendingRsvp(null);
      setRsvpNote('');
      await fetchEventDataRef.current();

      // Check if event requires payment for this member's tier
      const isPrem = membershipStatus === 'premium' || membershipStatus === 'grace-period';
      const fee = isPrem ? event?.fee_premium : event?.fee_basic;
      if (fee != null && fee > 0) {
        setShowPaymentFlow(true);
      } else {
        showToast(
          level === 'will_lead'
            ? (locale === 'vi' ? 'Bạn đã đăng ký vai trò dẫn dắt.' : 'You are registered as a lead.')
            : (locale === 'vi' ? 'Bạn đã đăng ký tham gia sự kiện.' : 'You are registered for the event.'),
          'success',
        );
      }
    } catch (error) {
      console.error('Failed to RSVP:', error);
      showToast(locale === 'vi' ? 'Không thể cập nhật đăng ký.' : 'Unable to update RSVP.');
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleRemoveRsvp() {
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/community/events/${eventId}/rsvp`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || (locale === 'vi' ? 'Không thể hủy đăng ký.' : 'Unable to cancel RSVP.'));
        return;
      }

      setConfirmRemove(false);
      await fetchEventDataRef.current();
      showToast(locale === 'vi' ? 'Đã hủy đăng ký tham gia.' : 'Your RSVP has been cancelled.', 'success');
    } catch (error) {
      console.error('Failed to remove RSVP:', error);
      showToast(locale === 'vi' ? 'Không thể hủy đăng ký.' : 'Unable to cancel RSVP.');
    } finally {
      setRsvpLoading(false);
    }
  }

  const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','👍','👏','🎉','🔥','❤️','💯','🙏','😢','😮','✅','⭐','💪','🤝','👀'];

  function insertEmoji(emoji: string, isReply?: boolean) {
    if (isReply) {
      setReplyBody(prev => prev + emoji);
    } else {
      setCommentBody(prev => prev + emoji);
    }
    setShowEmojiPicker(null);
  }

  function handleCommentImageSelect(e: React.ChangeEvent<HTMLInputElement>, isReply?: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(locale === 'vi' ? 'Ảnh tối đa 5MB.' : 'Image max 5MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      showToast(locale === 'vi' ? 'Chỉ hỗ trợ JPEG, PNG, WebP, GIF.' : 'Only JPEG, PNG, WebP, GIF allowed.');
      return;
    }
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
    const body = parentCommentId ? replyBody.trim() : commentBody.trim();
    const imageFile = parentCommentId ? replyImageFile : commentImageFile;
    if ((!body && !imageFile) || commentLoading) return;

    setCommentLoading(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const url = await uploadCommentImage(imageFile);
        if (url) image_url = url;
        else {
          showToast(locale === 'vi' ? 'Không thể tải ảnh lên.' : 'Failed to upload image.');
          setCommentLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/community/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body || '', parent_comment_id: parentCommentId, image_url }),
      });
      if (res.ok) {
        const data = await res.json();
        const newComment: EventComment = {
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
          setCommentBody('');
          clearCommentImage(false);
          setComments(prev => [...prev, newComment]);
        }
        if (event) {
          setEvent({ ...event, comment_count: event.comment_count + 1 });
        }
      } else {
        showToast(locale === 'vi' ? 'Không thể gửi bình luận.' : 'Unable to post comment.');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      showToast(locale === 'vi' ? 'Không thể gửi bình luận.' : 'Unable to post comment.');
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editBody.trim()) return;
    const newBody = editBody.trim();
    setEditingComment(null);
    setEditBody('');

    // Optimistic update
    const updateBody = (list: EventComment[]): EventComment[] =>
      list.map(c => c.id === commentId
        ? { ...c, body: newBody }
        : { ...c, replies: c.replies ? updateBody(c.replies) : [] }
      );
    setComments(prev => updateBody(prev));

    try {
      await fetch(`/api/community/events/${eventId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  }

  async function handleDeleteComment(commentId: string) {
    // Optimistic delete
    setComments(prev => prev
      .filter(c => c.id !== commentId)
      .map(c => ({ ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }))
    );
    if (event) {
      setEvent({ ...event, comment_count: Math.max(0, event.comment_count - 1) });
    }

    try {
      await fetch(`/api/community/events/${eventId}/comments/${commentId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }

  const activeRsvps = useMemo(
    () => rsvps.filter((rsvp) => rsvp.commitment_level === 'will_participate' || rsvp.commitment_level === 'will_lead'),
    [rsvps],
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-2/3" />
          <div className="h-72 bg-gray-50 rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-28 bg-gray-50 rounded-2xl" />
            <div className="h-28 bg-gray-50 rounded-2xl" />
          </div>
          <div className="h-48 bg-gray-50 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">{locale === 'vi' ? 'Không tìm thấy sự kiện.' : 'Event not found.'}</p>
        <Link href="/events" className="text-blue-600 hover:underline mt-2 inline-block">
          {locale === 'vi' ? 'Quay lại' : 'Back to events'}
        </Link>
      </div>
    );
  }

  const eventMode = deriveEventMode(event);
  const modeLabel = EVENT_MODE_LABELS[eventMode][locale === 'vi' ? 'vi' : 'en'];
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[locale === 'vi' ? 'vi' : 'en'] || event.category;
  const statusInfo = EVENT_STATUS_LABELS[event.status];
  const isPremium = membershipStatus === 'premium' || membershipStatus === 'grace-period';
  const registeredCount = activeRsvps.length;
  const totalCapacity = (event.capacity_premium || 0) + (event.capacity_basic || 0) || event.capacity || 0;
  const capacityPercent = totalCapacity ? (registeredCount / totalCapacity) * 100 : 0;
  const isFull = totalCapacity ? registeredCount >= totalCapacity : false;
  const isPremiumExclusive = event.capacity_basic === 0;
  const hasRsvp = myRsvp === 'will_participate' || myRsvp === 'will_lead';
  const canUpgradeToLead = myRsvp === 'will_participate' || myRsvp === 'will_lead';
  const isRegistrationClosed = event.registration_closed || (event.registration_deadline ? new Date(event.registration_deadline) < new Date() : false);

  function openRsvpModal(level: EventRegistrationLevel) {
    if (rsvpLoading) return;
    if (level === myRsvp) return;
    if (level === 'will_lead' && !canUpgradeToLead) {
      showToast(locale === 'vi' ? 'Hãy đăng ký tham gia trước khi chọn vai trò dẫn dắt.' : 'Join the event first before volunteering to lead.');
      return;
    }
    if (isFull && !hasRsvp) {
      showToast(locale === 'vi' ? 'Sự kiện đã hết chỗ đăng ký.' : 'This event is currently full.');
      return;
    }
    if (!isPremium && isPremiumExclusive) {
      showToast(locale === 'vi' ? 'Sự kiện này chỉ dành cho thành viên Premium.' : 'This event is for Premium members only.');
      return;
    }

    setPendingRsvp(level);
    setRsvpNote('');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/events" className="hover:text-blue-600">{locale === 'vi' ? 'Sự kiện' : 'Events'}</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-900">{event.title}</span>
      </nav>

      {event.image_url && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-stone-200 bg-stone-50">
          <div className="aspect-[2/1] relative">
            {/* Blurred background fill for non-2:1 images */}
            <img src={event.image_url} alt="" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-60" />
            {/* Sharp centered image */}
            <img src={event.image_url} alt="" className="relative h-full w-full object-contain" />
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getModePillClasses(eventMode)}`}>
            {modeLabel}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {categoryLabel}
          </span>
          {(() => {
            if (event.status === 'published') {
              const eventDate = new Date(event.event_date);
              const now = new Date();
              const diffMs = eventDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays > 1) {
                return (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {locale === 'vi' ? `Còn ${diffDays} ngày` : `In ${diffDays} days`}
                  </span>
                );
              } else if (diffDays === 1) {
                return (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    {locale === 'vi' ? 'Diễn ra ngày mai' : 'Tomorrow'}
                  </span>
                );
              } else if (diffDays === 0 || (diffMs > 0 && diffDays <= 0)) {
                return (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 animate-pulse">
                    {locale === 'vi' ? 'Diễn ra hôm nay' : 'Today'}
                  </span>
                );
              } else {
                return (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {locale === 'vi' ? 'Đã diễn ra' : 'Past event'}
                  </span>
                );
              }
            }
            return (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusInfo.color === 'blue' ? 'bg-blue-50 text-blue-700'
                : statusInfo.color === 'red' ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
                {statusInfo[locale === 'vi' ? 'vi' : 'en']}
              </span>
            );
          })()}
          {isPremiumExclusive && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {locale === 'vi' ? 'Chỉ dành cho Premium' : 'Premium only'}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{event.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          {locale === 'vi'
            ? 'Thông tin tham gia được tóm tắt bên dưới để bạn biết rõ hình thức, địa điểm và cách đăng ký trước khi xác nhận.'
            : 'Everything you need before registering is summarized below: format, schedule, location, and the registration rules.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
            {locale === 'vi' ? 'Thông tin chính' : 'At a Glance'}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoBlock
              label={locale === 'vi' ? 'Ngày sự kiện' : 'Event Date'}
              value={formatEventDateRange(event.event_date, event.event_end_date, locale)}
            />
            <InfoBlock
              label={locale === 'vi' ? 'Hạn chót đăng ký' : 'Registration Deadline'}
              value={event.registration_deadline
                ? formatDateTime(event.registration_deadline, locale)
                : (locale === 'vi' ? 'Chưa đặt' : 'Not set')}
            />
            <InfoBlock
              label={locale === 'vi' ? 'Hình thức' : 'Mode'}
              value={modeLabel}
            />
            <InfoBlock
              label={locale === 'vi' ? 'Người tổ chức' : 'Organizer'}
              value={event.author_name || 'ABG Alumni'}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">
            {locale === 'vi' ? 'Địa điểm tổ chức' : 'Event Venue'}
          </h2>
          <div className="mt-4 space-y-4 text-sm text-stone-700">
            {(eventMode === 'offline' || eventMode === 'hybrid') && (
              <div>
                <p className="font-medium text-stone-900">{locale === 'vi' ? 'Địa điểm' : 'Venue'}</p>
                <p className="mt-1">{event.location || (locale === 'vi' ? 'Sẽ cập nhật sau' : 'To be announced')}</p>
                {event.location_url && (
                  <a
                    href={event.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    {locale === 'vi' ? 'Mở chỉ đường hoặc chi tiết địa điểm' : 'Open venue details'}
                  </a>
                )}
              </div>
            )}

            {eventMode === 'online' && (
              <div>
                <p className="font-medium text-stone-900">{locale === 'vi' ? 'Nền tảng tham gia' : 'Meeting platform'}</p>
                <p className="mt-1">{event.location || (locale === 'vi' ? 'Sự kiện trực tuyến' : 'Online event')}</p>
                {event.location_url ? (
                  <a
                    href={event.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    {locale === 'vi' ? 'Mở liên kết tham gia' : 'Open join link'}
                  </a>
                ) : (
                  <p className="mt-2 text-stone-500">
                    {locale === 'vi' ? 'Liên kết tham gia sẽ được gửi sau khi đăng ký.' : 'The join link will be shared after registration.'}
                  </p>
                )}
              </div>
            )}

            {eventMode === 'hybrid' && event.location_url && (
              <div>
                <p className="font-medium text-stone-900">{locale === 'vi' ? 'Tham gia trực tuyến' : 'Join online'}</p>
                <a
                  href={event.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  {locale === 'vi' ? 'Mở liên kết tham gia' : 'Open join link'}
                </a>
              </div>
            )}

          </div>
        </section>
      </div>

      {/* Recap Section */}
      {(event.recap_text || (event.recap_images && event.recap_images.length > 0)) && (
        <section className="mt-6 rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2 mb-4">
            <span className="text-xl">📸</span>
            Recap
          </h2>
          {event.recap_text && (
            <div className="prose prose-sm max-w-none text-gray-700 mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ a: ({ href, children }) => <a href={href} className="text-purple-600 underline hover:text-purple-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>
                {linkifyText(event.recap_text)}
              </ReactMarkdown>
            </div>
          )}
          {event.recap_images && event.recap_images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {event.recap_images.map((url, i) => (
                <button key={i} onClick={() => setLightboxImage(url)} className="block aspect-[4/3] rounded-lg overflow-hidden border border-purple-200 hover:border-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <img src={url} alt={`Recap ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>
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

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {locale === 'vi' ? 'Giới thiệu sự kiện' : 'About This Event'}
            </h2>
            <div className="prose prose-sm mt-3 max-w-none text-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>{linkifyText(event.description)}</ReactMarkdown>
            </div>
          </div>

          <div className="min-w-[240px] rounded-2xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {locale === 'vi' ? 'Đăng ký hiện tại' : 'Registration Snapshot'}
            </p>
            <p className="mt-3 text-2xl font-semibold text-stone-900">
              {registeredCount}
              {totalCapacity > 0 && <span className="text-lg text-stone-500"> / {totalCapacity}</span>}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {locale === 'vi' ? 'thành viên đã xác nhận tham gia' : 'members confirmed to attend'}
            </p>

            {/* Per-tier breakdown */}
            {(event.capacity_premium != null || event.capacity_basic != null) && (
              <div className="mt-3 space-y-1.5">
                {event.capacity_premium != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Premium</span>
                    <span className="font-medium text-stone-800">
                      {tierCounts.premium}{event.capacity_premium > 0 ? ` / ${event.capacity_premium}` : ''}
                    </span>
                  </div>
                )}
                {event.capacity_basic != null && event.capacity_basic > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Basic</span>
                    <span className="font-medium text-stone-800">
                      {tierCounts.basic} / {event.capacity_basic}
                    </span>
                  </div>
                )}
                {event.capacity_guest != null && event.capacity_guest > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">{locale === 'vi' ? 'Khách' : 'Guest'}</span>
                    <span className="font-medium text-stone-800">
                      {event.guest_rsvp_count || 0} / {event.capacity_guest}
                    </span>
                  </div>
                )}
              </div>
            )}

            {totalCapacity > 0 && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      capacityPercent >= 95 ? 'bg-red-500' :
                      capacityPercent >= 80 ? 'bg-amber-500' :
                      'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {isFull
                    ? (locale === 'vi' ? 'Hiện tại không còn chỗ trống.' : 'No open seats at the moment.')
                    : (locale === 'vi' ? 'Số chỗ có thể thay đổi theo loại thành viên.' : 'Availability may vary by membership tier.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Fee Pricing */}
      {event.status === 'published' && (event.fee_premium != null || event.fee_basic != null || event.fee_guest != null) && (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {locale === 'vi' ? 'Phí tham gia' : 'Event Fees'}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {event.fee_premium != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">ABG Premium</p>
                <p className="text-xl font-bold text-gray-900">
                  {event.fee_premium === 0 ? (locale === 'vi' ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_premium)} VND`}
                </p>
              </div>
            )}
            {event.fee_basic != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">ABG Basic</p>
                <p className="text-xl font-bold text-gray-900">
                  {event.fee_basic === 0 ? (locale === 'vi' ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_basic)} VND`}
                </p>
              </div>
            )}
            {event.fee_guest != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">{locale === 'vi' ? 'Khách' : 'Guest'}</p>
                <p className="text-xl font-bold text-gray-900">
                  {event.fee_guest === 0 ? (locale === 'vi' ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_guest)} VND`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {event.status === 'published' && (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {locale === 'vi' ? 'Đăng ký tham gia' : 'Register'}
              </h2>
              <div className="mt-1 flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-600">
                  {locale === 'vi'
                    ? 'Chỉ những người chọn tham gia hoặc dẫn dắt mới được tính là đã đăng ký.'
                    : 'Only members who choose to join or lead are counted as registered attendees.'}
                </p>
                {event.rsvp_score > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span>🔥</span> {locale === 'vi' ? 'Điểm cam kết' : 'Commitment'}: {event.rsvp_score}
                  </span>
                )}
              </div>
            </div>

            {myRsvp === 'will_participate' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {locale === 'vi' ? 'Bạn đã đăng ký tham gia' : 'You are registered to join'}
                </span>
                {(() => {
                  const isPrem = membershipStatus === 'premium' || membershipStatus === 'grace-period';
                  const fee = isPrem ? event.fee_premium : event.fee_basic;
                  if (fee == null || fee <= 0) return null;
                  if (myPaymentStatus === 'confirmed') {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {locale === 'vi' ? 'Đã thanh toán' : 'Paid'}
                      </span>
                    );
                  }
                  if (myPaymentStatus === 'pending') {
                    return (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                        {locale === 'vi' ? 'Chờ xác nhận thanh toán' : 'Payment pending'}
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={() => setShowPaymentFlow(true)}
                      className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      {locale === 'vi' ? 'Thanh toán' : 'Pay Now'}
                    </button>
                  );
                })()}
              </div>
            )}
            {myRsvp === 'will_lead' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                  {locale === 'vi' ? 'Bạn đang tham gia với vai trò dẫn dắt' : 'You are registered as a lead'}
                </span>
                {(() => {
                  const isPrem = membershipStatus === 'premium' || membershipStatus === 'grace-period';
                  const fee = isPrem ? event.fee_premium : event.fee_basic;
                  if (fee == null || fee <= 0) return null;
                  if (myPaymentStatus === 'confirmed') {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {locale === 'vi' ? 'Đã thanh toán' : 'Paid'}
                      </span>
                    );
                  }
                  if (myPaymentStatus === 'pending') {
                    return (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                        {locale === 'vi' ? 'Chờ xác nhận thanh toán' : 'Payment pending'}
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={() => setShowPaymentFlow(true)}
                      className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      {locale === 'vi' ? 'Thanh toán' : 'Pay Now'}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>

          {isRegistrationClosed && !hasRsvp && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-red-800">
                {locale === 'vi' ? '🚫 Đăng ký đã đóng' : '🚫 Registration is closed'}
              </p>
              <p className="mt-1 text-xs text-red-700">
                {event.registration_closed
                  ? (locale === 'vi' ? 'Sự kiện này đã ngừng nhận đăng ký mới.' : 'This event is no longer accepting new registrations.')
                  : (locale === 'vi' ? 'Đã quá hạn chót đăng ký.' : 'The registration deadline has passed.')}
              </p>
            </div>
          )}

          {!isRegistrationClosed && (
            <>
              {!isPremium && isPremiumExclusive && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {locale === 'vi'
                    ? 'Sự kiện này chỉ dành cho thành viên Premium. Vui lòng nâng cấp để đăng ký.'
                    : 'This event is reserved for Premium members. Upgrade before registering.'}
                </div>
              )}

              {!isPremium && !isPremiumExclusive && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {locale === 'vi'
                    ? 'Thành viên Basic có thể đăng ký khi còn chỗ. Premium được ưu tiên khi số lượng chỗ có giới hạn.'
                    : 'Basic members can register while seats remain. Premium members receive priority when seats are limited.'}
                </div>
              )}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {RSVP_ACTIONS.map((action) => {
                  const isSelected = myRsvp === action.level;
                  const isDisabled =
                    rsvpLoading ||
                    (!isPremium && isPremiumExclusive) ||
                    (isFull && !hasRsvp) ||
                    (action.level === 'will_lead' && !canUpgradeToLead);

                  return (
                    <button
                      key={action.level}
                      type="button"
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      onClick={() => openRsvpModal(action.level)}
                      className={`rounded-2xl border-2 px-5 py-5 text-left transition-all duration-200 ${
                        isSelected
                          ? action.level === 'will_lead'
                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md shadow-amber-100'
                            : 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-100'
                          : action.level === 'will_lead'
                            ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 hover:border-amber-300 hover:shadow-md'
                            : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 hover:border-blue-300 hover:shadow-md'
                      } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 text-lg font-bold">
                        <span className="text-xl">{action.icon}</span>
                        <span className={action.level === 'will_lead' ? 'text-amber-800' : 'text-blue-800'}>
                          {action.label[locale === 'vi' ? 'vi' : 'en']}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {action.helper[locale === 'vi' ? 'vi' : 'en']}
                      </p>
                      {action.level === 'will_lead' && !canUpgradeToLead && (
                        <p className="mt-3 text-xs font-medium text-amber-700">
                          {locale === 'vi'
                            ? 'Hãy chọn "Tham gia ngay" trước, sau đó bạn có thể nâng cấp lên vai trò tổ chức.'
                            : 'Choose "Join Now" first, then you can upgrade to an organizer role.'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {isFull && !hasRsvp && (
              <span className="text-red-600">
                {locale === 'vi' ? 'Sự kiện hiện đã đủ số lượng đăng ký.' : 'This event is currently full.'}
              </span>
            )}
            {myRsvp === 'will_lead' && (
              <span>
                {locale === 'vi' ? 'Bạn có thể chuyển lại về chế độ tham gia bình thường bất kỳ lúc nào.' : 'You can switch back to a normal attendee role at any time.'}
              </span>
            )}
            {hasRsvp && event.allow_cancellation !== false && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="font-medium text-red-600 hover:text-red-700"
              >
                {locale === 'vi' ? 'Hủy đăng ký' : 'Cancel RSVP'}
              </button>
            )}
          </div>
          {hasRsvp && (
            <p className="mt-3 text-xs text-gray-500">
              {event.allow_cancellation !== false
                ? (locale === 'vi'
                  ? 'Bạn có thể hủy đăng ký bất kỳ lúc nào trước khi sự kiện kết thúc.'
                  : 'You can cancel your RSVP any time before the event is closed.')
                : (locale === 'vi'
                  ? 'Sau khi đăng ký, bạn không thể tự hủy. Vui lòng liên hệ ban tổ chức nếu cần.'
                  : 'Cancellation is not available. Please contact the organizer if needed.')}
            </p>
          )}
        </section>
      )}

      {activeRsvps.length > 0 && (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {locale === 'vi' ? 'Người đã đăng ký' : 'Registered Members'} ({activeRsvps.length})
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...activeRsvps]
              .sort((a, b) => {
                const order: Record<string, number> = { will_lead: 0, will_participate: 1 };
                return (order[a.commitment_level] ?? 9) - (order[b.commitment_level] ?? 9);
              })
              .map((rsvp) => {
                const isLead = rsvp.commitment_level === 'will_lead';
                return (
                  <div
                    key={rsvp.id}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm ${
                      isLead ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-stone-100 text-stone-700'
                    }`}
                    title={RSVP_LABELS[rsvp.commitment_level as EventRegistrationLevel]?.[locale === 'vi' ? 'vi' : 'en']}
                  >
                    {isLead && <span>👑</span>}
                    {rsvp.member_avatar_url ? (
                      <img src={rsvp.member_avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(rsvp.member_name || '?')}`}>
                        {(rsvp.member_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{rsvp.member_name || 'Member'}</span>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Email Invite — for creator or admin */}
      {(currentMemberId === event.created_by_member_id || currentMemberIsAdmin) && (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'vi' ? 'Gửi lời mời' : 'Send Invitations'}
          </h3>
          <EventEmailInviteSection
            eventId={eventId}
            eventTitle={event.title}
            eventDate={event.event_date}
            locale={locale}
            onSuccess={() => fetchEventDataRef.current()}
          />
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {locale === 'vi' ? 'Thảo luận' : 'Discussion'} ({event.comment_count})
        </h2>

        {session && event.status === 'published' && (
          <form onSubmit={handleComment} className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {locale === 'vi' ? 'Bạn muốn hỏi hoặc chia sẻ gì về sự kiện này?' : 'Questions or notes for the event discussion'}
            </label>
            <div className="rounded-2xl border border-gray-200 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.closest('form')?.requestSubmit(); } }}
                placeholder={locale === 'vi' ? 'Ví dụ: Tôi nên chuẩn bị gì trước khi tham gia?' : 'For example: Is there anything I should prepare before joining?'}
                className="w-full resize-none rounded-t-2xl border-0 px-4 py-3 text-sm focus:outline-none focus:ring-0"
                rows={3}
                maxLength={2000}
              />
              {commentImagePreview && (
                <div className="relative mx-4 mb-2 inline-block">
                  <img src={commentImagePreview} alt="Preview" className="max-h-32 rounded-xl border border-gray-200 object-cover" />
                  <button type="button" onClick={() => clearCommentImage(false)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600">&times;</button>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
                <div className="relative flex items-center gap-0.5">
                  <input ref={commentImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleCommentImageSelect(e)} />
                  <button type="button" onClick={() => commentImageRef.current?.click()} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title={locale === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" /></svg>
                  </button>
                  <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === 'main' ? null : 'main')} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="Emoji">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                  </button>
                  {showEmojiPicker === 'main' && (
                    <div className="absolute bottom-full left-0 z-10 mb-1 grid w-64 grid-cols-10 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                      {EMOJI_LIST.map((e) => (
                        <button key={e} type="button" onClick={() => insertEmoji(e)} className="rounded p-1 text-lg hover:bg-gray-100">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
                  <button
                    type="submit"
                    disabled={(!commentBody.trim() && !commentImageFile) || commentLoading}
                    className="rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commentLoading
                      ? (locale === 'vi' ? 'Đang gửi...' : 'Posting...')
                      : (locale === 'vi' ? 'Gửi bình luận' : 'Post Comment')}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {locale === 'vi' ? 'Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện.' : 'No comments yet. Start the conversation.'}
          </p>
        ) : (
          <div className="mt-5 space-y-4" aria-live="polite">
            {comments.map((comment) => (
              <div key={comment.id}>
                <div className="flex gap-3 rounded-2xl bg-stone-50 p-4">
                  {comment.member_avatar_url ? (
                    <img src={comment.member_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(comment.member_name || '?')}`}>
                      {(comment.member_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.member_name || 'Member'}</span>
                      <span className="text-xs text-gray-500">{formatRelativeTime(comment.created_at, locale)}</span>
                    </div>
                    {editingComment === comment.id ? (
                      <div className="mt-1">
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          maxLength={2000}
                          autoFocus
                        />
                        <div className="mt-2 flex gap-2 justify-end">
                          <button onClick={() => setEditingComment(null)} className="text-xs text-gray-500 px-3 py-1">
                            {locale === 'vi' ? 'Hủy' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            disabled={!editBody.trim()}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {locale === 'vi' ? 'Lưu' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{renderMentions(comment.body)}</p>
                        {comment.image_url && (
                          <a href={comment.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                            <img src={comment.image_url} alt="" className="max-h-60 rounded-xl border border-gray-200 object-cover" />
                          </a>
                        )}
                      </>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <CommentReactions
                        commentId={comment.id}
                        commentType="event"
                        entityId={eventId}
                        reactions={comment.reactions}
                        onReactionChange={() => void fetchCommentsDataRef.current()}
                      />
                      {session && event?.status === 'published' && (
                        <button
                          onClick={() => { if (replyingTo === comment.id) { setReplyingTo(null); setReplyBody(''); } else { setReplyingTo(comment.id); if (comment.member_id !== currentMemberId) { const authorName = comment.member_name || 'Member'; setReplyBody(`@[${authorName}](${comment.member_id}) `); } else { setReplyBody(''); } } }}
                          className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          {locale === 'vi' ? 'Trả lời' : 'Reply'}
                        </button>
                      )}
                      {currentMemberId === comment.member_id && (
                        <>
                          <button
                            onClick={() => { setEditingComment(comment.id); setEditBody(comment.body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')); }}
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {locale === 'vi' ? 'Sửa' : 'Edit'}
                          </button>
                          <button
                            onClick={() => { if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) handleDeleteComment(comment.id); }}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                          >
                            {locale === 'vi' ? 'Xóa' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2 rounded-xl bg-gray-50 p-3">
                        {reply.member_avatar_url ? (
                          <img src={reply.member_avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(reply.member_name || '?')}`}>
                            {(reply.member_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{reply.member_name || 'Member'}</span>
                            <span className="text-xs text-gray-500">{formatRelativeTime(reply.created_at, locale)}</span>
                          </div>
                          {editingComment === reply.id ? (
                            <div className="mt-1">
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-gray-700">{renderMentions(reply.body)}</p>
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
                              commentType="event"
                              entityId={eventId}
                              reactions={reply.reactions}
                            />
                            {currentMemberId === reply.member_id && (
                              <>
                                <button onClick={() => { setEditingComment(reply.id); setEditBody(reply.body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')); }} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">{locale === 'vi' ? 'Sửa' : 'Edit'}</button>
                                <button onClick={() => { if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) handleDeleteComment(reply.id); }} className="text-xs text-gray-400 hover:text-red-600 transition-colors">{locale === 'vi' ? 'Xóa' : 'Delete'}</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <form onSubmit={(e) => handleComment(e, comment.id)} className="ml-12 mt-2 pl-4">
                    <div className="rounded-xl border border-gray-200 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.closest('form')?.requestSubmit(); } }}
                        placeholder={locale === 'vi' ? 'Viết trả lời...' : 'Write a reply...'}
                        className="w-full resize-none rounded-t-xl border-0 px-3 py-2 text-sm focus:outline-none focus:ring-0"
                        rows={2}
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
                          <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
                          <button
                            type="submit"
                            disabled={(!replyBody.trim() && !replyImageFile) || commentLoading}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
          </div>
        )}
      </section>

      {pendingRsvp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !rsvpLoading && setPendingRsvp(null)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900">
              {pendingRsvp === 'will_lead'
                ? (locale === 'vi' ? 'Xác nhận vai trò dẫn dắt' : 'Confirm lead role')
                : (locale === 'vi' ? 'Xác nhận đăng ký tham gia' : 'Confirm registration')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {locale === 'vi'
                ? 'Hãy kiểm tra lại thông tin trước khi xác nhận. Bạn có thể thêm ghi chú hoặc câu hỏi cho ban tổ chức nếu cần.'
                : 'Review the event details before confirming. You can add an optional note or question for the organizer.'}
            </p>

            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
              <p><span className="font-medium text-stone-900">{locale === 'vi' ? 'Sự kiện:' : 'Event:'}</span> {event.title}</p>
              <p className="mt-2"><span className="font-medium text-stone-900">{locale === 'vi' ? 'Thời gian:' : 'When:'}</span> {formatShortDateTime(event.event_date, locale)}</p>
              <p className="mt-2"><span className="font-medium text-stone-900">{locale === 'vi' ? 'Hình thức:' : 'Mode:'}</span> {modeLabel}</p>
              <p className="mt-2"><span className="font-medium text-stone-900">{locale === 'vi' ? 'Phản hồi của bạn:' : 'Your response:'}</span> {RSVP_LABELS[pendingRsvp][locale === 'vi' ? 'vi' : 'en']}</p>
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-700">
              {event.require_question && !hasRsvp
                ? (event.question_prompt || (locale === 'vi' ? 'Câu hỏi dành cho diễn giả (bắt buộc)' : 'Question for the speaker (required)'))
                : (locale === 'vi' ? 'Ghi chú hoặc câu hỏi cho ban tổ chức (không bắt buộc)' : 'Note or question for the organizer (optional)')}
              {event.require_question && !hasRsvp && <span className="ml-1 text-red-500">*</span>}
            </label>
            <textarea
              value={rsvpNote}
              onChange={(e) => setRsvpNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={event.require_question && !hasRsvp
                ? (locale === 'vi' ? 'Nhập câu hỏi bạn muốn gửi cho diễn giả...' : 'Enter your question for the speaker...')
                : (locale === 'vi' ? 'Ví dụ: Tôi sẽ đến muộn 10 phút.' : 'For example: I may arrive 10 minutes late.')}
              className={`mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${event.require_question && !hasRsvp && !rsvpNote.trim() ? 'border-red-300' : 'border-gray-200'}`}
            />

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRsvp(null)}
                disabled={rsvpLoading}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {locale === 'vi' ? 'Quay lại' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => submitRsvp(pendingRsvp)}
                disabled={rsvpLoading || (event.require_question && !hasRsvp && !rsvpNote.trim())}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rsvpLoading
                  ? (locale === 'vi' ? 'Đang xác nhận...' : 'Confirming...')
                  : (locale === 'vi' ? 'Xác nhận đăng ký' : 'Confirm RSVP')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmRemove}
        title={locale === 'vi' ? 'Hủy đăng ký?' : 'Cancel your RSVP?'}
        message={
          locale === 'vi'
            ? 'Bạn có thể đăng ký lại sau nếu còn chỗ. Hành động này sẽ xóa trạng thái tham gia hiện tại của bạn.'
            : 'You can register again later if seats remain. This will remove your current RSVP status.'
        }
        variant="warning"
        confirmLabel={locale === 'vi' ? 'Hủy đăng ký' : 'Cancel RSVP'}
        cancelLabel={locale === 'vi' ? 'Giữ nguyên' : 'Keep RSVP'}
        onConfirm={handleRemoveRsvp}
        onCancel={() => setConfirmRemove(false)}
      />

      {/* Payment Flow Modal */}
      {showPaymentFlow && event && session?.user && (() => {
        const isPrem = membershipStatus === 'premium' || membershipStatus === 'grace-period';
        const payerType: PayerType = isPrem ? 'premium' : 'basic';
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {locale === 'vi' ? 'Thanh toán phí sự kiện' : 'Event Payment'}
                </h2>
                <button onClick={() => setShowPaymentFlow(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="p-6">
                <EventPaymentFlow
                  event={event}
                  payerType={payerType}
                  payerName={session.user.name || session.user.email || ''}
                  payerEmail={session.user.email || ''}
                  payerPhone={memberPhone || undefined}
                  paymentId=""
                  onComplete={() => {
                    setShowPaymentFlow(false);
                    showToast(locale === 'vi' ? 'Đã gửi xác nhận thanh toán!' : 'Payment confirmation sent!', 'success');
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-stone-900">{value}</p>
    </div>
  );
}
