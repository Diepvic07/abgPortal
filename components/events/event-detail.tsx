'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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

const RSVP_ACTIONS: Array<{
  level: EventRegistrationLevel;
  icon: string;
  label: { en: string; vi: string };
  helper: { en: string; vi: string };
}> = [
  {
    level: 'will_participate',
    icon: '🙌',
    label: { en: 'Will Join', vi: 'Sẽ tham gia' },
    helper: {
      en: 'Reserve your spot and receive event updates.',
      vi: 'Giữ chỗ của bạn và nhận cập nhật về sự kiện.',
    },
  },
  {
    level: 'will_lead',
    icon: '👑',
    label: { en: 'Will Lead', vi: 'Sẽ dẫn dắt' },
    helper: {
      en: 'Volunteer to help host or coordinate this event.',
      vi: 'Tình nguyện hỗ trợ tổ chức hoặc điều phối sự kiện này.',
    },
  },
];

const RSVP_LABELS: Record<EventRegistrationLevel, { en: string; vi: string }> = {
  will_participate: { en: 'Will Join', vi: 'Sẽ tham gia' },
  will_lead: { en: 'Will Lead', vi: 'Sẽ dẫn dắt' },
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
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('basic');
  const [pendingRsvp, setPendingRsvp] = useState<EventRegistrationLevel | null>(null);
  const [rsvpNote, setRsvpNote] = useState('');
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [myPaymentStatus, setMyPaymentStatus] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
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

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/community/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (res.ok) {
        setCommentBody('');
        void fetchCommentsDataRef.current();
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
          <img src={event.image_url} alt="" className="h-72 w-full object-cover" />
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
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusInfo.color === 'green'
              ? 'bg-green-50 text-green-700'
              : statusInfo.color === 'blue'
              ? 'bg-blue-50 text-blue-700'
              : statusInfo.color === 'red'
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {statusInfo[locale === 'vi' ? 'vi' : 'en']}
          </span>
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
              label={locale === 'vi' ? 'Mở đăng ký' : 'Registration Opens'}
              value={formatDateTime(event.event_date, locale)}
            />
            <InfoBlock
              label={locale === 'vi' ? 'Hạn đăng ký' : 'Registration Closes'}
              value={event.event_end_date ? formatDateTime(event.event_end_date, locale) : (locale === 'vi' ? 'Chưa đặt' : 'Not set')}
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
            {locale === 'vi' ? 'Cách tham gia' : 'How to Attend'}
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

            <div className="rounded-2xl bg-white px-4 py-3 text-stone-600">
              {event.allow_cancellation !== false
                ? (locale === 'vi'
                  ? 'Sau khi đăng ký, bạn có thể hủy đăng ký bất kỳ lúc nào trước khi sự kiện kết thúc.'
                  : 'After registering, you can cancel your RSVP any time before the event is closed.')
                : (locale === 'vi'
                  ? 'Sau khi đăng ký, bạn không thể tự hủy đăng ký. Vui lòng liên hệ ban tổ chức nếu cần.'
                  : 'After registering, cancellation is not available. Please contact the organizer if needed.')}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {locale === 'vi' ? 'Giới thiệu sự kiện' : 'About This Event'}
            </h2>
            <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-gray-700">
              {event.description}
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
            {totalCapacity > 0 && (
              <div className="mt-4">
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
              <p className="mt-1 text-sm text-gray-600">
                {locale === 'vi'
                  ? 'Chỉ những người chọn tham gia hoặc dẫn dắt mới được tính là đã đăng ký.'
                  : 'Only members who choose to join or lead are counted as registered attendees.'}
              </p>
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
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? action.level === 'will_lead'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-blue-300 bg-blue-50'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <span>{action.icon}</span>
                    <span>{action.label[locale === 'vi' ? 'vi' : 'en']}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {action.helper[locale === 'vi' ? 'vi' : 'en']}
                  </p>
                  {action.level === 'will_lead' && !canUpgradeToLead && (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      {locale === 'vi'
                        ? 'Hãy chọn "Sẽ tham gia" trước, sau đó bạn có thể nâng cấp lên vai trò dẫn dắt.'
                        : 'Choose "Will Join" first, then you can upgrade to a lead role.'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

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
                      <img src={rsvp.member_avatar_url} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-300 text-xs text-white">
                        {(rsvp.member_name || '?')[0]}
                      </div>
                    )}
                    <span className="font-medium">{rsvp.member_name || 'Member'}</span>
                  </div>
                );
              })}
          </div>
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
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={locale === 'vi' ? 'Ví dụ: Tôi nên chuẩn bị gì trước khi tham gia?' : 'For example: Is there anything I should prepare before joining?'}
              className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={2000}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!commentBody.trim() || commentLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentLoading
                  ? (locale === 'vi' ? 'Đang gửi...' : 'Posting...')
                  : (locale === 'vi' ? 'Gửi bình luận' : 'Post Comment')}
              </button>
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
              <div key={comment.id} className="flex gap-3 rounded-2xl bg-stone-50 p-4">
                {comment.member_avatar_url ? (
                  <img src={comment.member_avatar_url} alt="" className="h-9 w-9 rounded-full" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-300 text-sm text-white">
                    {(comment.member_name || '?')[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.member_name || 'Member'}</span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(comment.created_at, locale)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.body}</p>
                </div>
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
              {locale === 'vi' ? 'Ghi chú hoặc câu hỏi cho ban tổ chức (không bắt buộc)' : 'Note or question for the organizer (optional)'}
            </label>
            <textarea
              value={rsvpNote}
              onChange={(e) => setRsvpNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={locale === 'vi' ? 'Ví dụ: Tôi sẽ đến muộn 10 phút.' : 'For example: I may arrive 10 minutes late.'}
              className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                disabled={rsvpLoading}
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
