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

const AIRBNB_CARD_SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px';

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

function formatDateParts(dateStr: string, locale: string): { date: string; time: string } {
  try {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: dateStr, time: '' };
  }
}

function formatEventDateRangeParts(
  startStr: string,
  endStr: string | undefined,
  locale: string,
): { date: string; time: string } {
  if (!endStr) return formatDateParts(startStr, locale);

  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
      return {
        date: start.toLocaleDateString(loc, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        time: `${start.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`,
      };
    }

    return {
      date: `${start.toLocaleDateString(loc, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} – ${end.toLocaleDateString(loc, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`,
      time: `${start.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`,
    };
  } catch {
    return formatDateParts(startStr, locale);
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

function formatCurrencyVnd(amount: number, locale: string): string {
  if (amount === 0) {
    return locale === 'vi' ? 'Miễn phí' : 'Free';
  }

  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(amount)} VND`;
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
      <div className="mx-auto max-w-6xl px-1 py-6">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-32 rounded-full bg-stone-200" />
          <div className="h-14 w-3/4 rounded-3xl bg-stone-200" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_360px]">
            <div className="space-y-5">
              <div className="aspect-[16/10] rounded-[32px] bg-stone-200" />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="h-52 rounded-[28px] bg-stone-100" />
                <div className="h-52 rounded-[28px] bg-stone-100" />
              </div>
              <div className="h-72 rounded-[28px] bg-stone-100" />
            </div>
            <div className="h-[420px] rounded-[28px] bg-stone-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-[#222222]">
        <p className="text-[#6a6a6a]">{locale === 'vi' ? 'Không tìm thấy sự kiện.' : 'Event not found.'}</p>
        <Link href="/events" className="mt-3 inline-flex text-sm font-medium text-[#ff385c] hover:text-[#e00b41]">
          {locale === 'vi' ? 'Quay lại danh sách sự kiện' : 'Back to events'}
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
  const memberFee = isPremium ? event.fee_premium : event.fee_basic;
  const hasFees = event.fee_premium != null || event.fee_basic != null || event.fee_guest != null;
  const isPublished = event.status === 'published';
  const eventDateParts = formatEventDateRangeParts(event.event_date, event.event_end_date, locale);
  const registrationDeadlineParts = event.registration_deadline
    ? formatDateParts(event.registration_deadline, locale)
    : null;

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

  const eventTimingBadge = (() => {
    if (event.status !== 'published') {
      return (
        <SoftBadge tone={statusInfo.color === 'red' ? 'rose' : 'stone'}>
          {statusInfo[locale === 'vi' ? 'vi' : 'en']}
        </SoftBadge>
      );
    }

    const eventDate = new Date(event.event_date);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return (
        <SoftBadge tone="stone">
          {locale === 'vi' ? `Còn ${diffDays} ngày` : `In ${diffDays} days`}
        </SoftBadge>
      );
    }
    if (diffDays === 1) {
      return <SoftBadge tone="sand">{locale === 'vi' ? 'Diễn ra ngày mai' : 'Tomorrow'}</SoftBadge>;
    }
    if (diffDays === 0 || (diffMs > 0 && diffDays <= 0)) {
      return <SoftBadge tone="rose">{locale === 'vi' ? 'Diễn ra hôm nay' : 'Today'}</SoftBadge>;
    }
    return <SoftBadge tone="stone">{locale === 'vi' ? 'Đã diễn ra' : 'Past event'}</SoftBadge>;
  })();

  return (
    <div className="mx-auto max-w-6xl px-1 py-4 text-[#222222]">
      <nav className="mb-6 text-sm text-[#6a6a6a]">
        <Link href="/events" className="transition-colors hover:text-[#222222]">
          {locale === 'vi' ? 'Sự kiện' : 'Events'}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#222222]">{event.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <SoftBadge tone="stone">{modeLabel}</SoftBadge>
              <SoftBadge tone="plain">{categoryLabel}</SoftBadge>
              {eventTimingBadge}
              {isPremiumExclusive && (
                <SoftBadge tone="sand">{locale === 'vi' ? 'Chỉ dành cho Premium' : 'Premium only'}</SoftBadge>
              )}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_240px] xl:items-end">
              <div>
                <h1 className="font-heading text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#222222] md:text-[2.85rem]">
                  {event.title}
                </h1>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#6a6a6a]">
                  {locale === 'vi'
                    ? 'Mọi thông tin quan trọng được sắp xếp rõ ràng để bạn dễ dàng quyết định trước khi đăng ký.'
                    : 'Key details are laid out clearly so you can decide before registering.'}
                </p>
              </div>

              <div className="rounded-[28px] border border-black/5 bg-[#fff8f6] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
                  {locale === 'vi' ? 'Hosted by' : 'Hosted by'}
                </p>
                <p className="mt-2 text-base font-semibold text-[#222222]">
                  {event.author_name || 'ABG Alumni'}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                  {locale === 'vi'
                    ? 'Thời gian, địa điểm và cách tham gia được tóm tắt để bạn nắm rõ trước khi xác nhận.'
                    : 'Time, venue, and participation details summarised so you know what to expect.'}
                </p>
              </div>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-[32px] bg-white"
            style={{ boxShadow: AIRBNB_CARD_SHADOW }}
          >
            {event.image_url ? (
              <div className="aspect-[16/10] bg-[#f7f7f7]">
                <img src={event.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-end bg-[linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#f7f7f7_100%)] p-8">
                <div className="max-w-md">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
                    {locale === 'vi' ? 'Event Story' : 'Event Story'}
                  </p>
                  <p className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                    {locale === 'vi' ? 'Xem chi tiết sự kiện trước khi đăng ký tham gia.' : 'Review the event details before you register.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-black/5 p-5 sm:grid-cols-3 sm:p-6">
              <HeroFact
                label={locale === 'vi' ? 'When' : 'When'}
                value={<DateTimeValue date={eventDateParts.date} time={eventDateParts.time} />}
              />
              <HeroFact
                label={locale === 'vi' ? 'Where' : 'Where'}
                value={
                  eventMode === 'online'
                    ? (event.location || (locale === 'vi' ? 'Sự kiện trực tuyến' : 'Online event'))
                    : (event.location || (locale === 'vi' ? 'Sẽ cập nhật' : 'To be announced'))
                }
              />
              <HeroFact
                label={locale === 'vi' ? 'Registration' : 'Registration'}
                value={registrationDeadlineParts
                  ? <DateTimeValue date={registrationDeadlineParts.date} time={registrationDeadlineParts.time} />
                  : (locale === 'vi' ? 'Đang mở cho đến khi đầy chỗ' : 'Open until seats fill')}
              />
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
              <SectionEyebrow>{locale === 'vi' ? 'At a glance' : 'At a glance'}</SectionEyebrow>
              <div className="mt-4 grid gap-3">
                <InfoBlock
                  label={locale === 'vi' ? 'Ngày sự kiện' : 'Event date'}
                  value={<DateTimeValue date={eventDateParts.date} time={eventDateParts.time} />}
                />
                <InfoBlock
                  label={locale === 'vi' ? 'Hạn chót đăng ký' : 'Registration deadline'}
                  value={registrationDeadlineParts
                    ? <DateTimeValue date={registrationDeadlineParts.date} time={registrationDeadlineParts.time} />
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

            <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
              <SectionEyebrow>{locale === 'vi' ? 'Venue & access' : 'Venue & access'}</SectionEyebrow>
              <div className="mt-4 space-y-4">
                {(eventMode === 'offline' || eventMode === 'hybrid') && (
                  <VenueRow
                    label={locale === 'vi' ? 'Địa điểm trực tiếp' : 'In-person venue'}
                    value={event.location || (locale === 'vi' ? 'Sẽ cập nhật sau' : 'To be announced')}
                    linkLabel={event.location_url ? (locale === 'vi' ? 'Mở chi tiết địa điểm' : 'Open venue details') : undefined}
                    href={event.location_url || undefined}
                  />
                )}

                {eventMode === 'online' && (
                  <VenueRow
                    label={locale === 'vi' ? 'Nền tảng tham gia' : 'Meeting platform'}
                    value={event.location || (locale === 'vi' ? 'Sự kiện trực tuyến' : 'Online event')}
                    linkLabel={event.location_url ? (locale === 'vi' ? 'Mở liên kết tham gia' : 'Open join link') : undefined}
                    href={event.location_url || undefined}
                    helper={
                      event.location_url
                        ? undefined
                        : (locale === 'vi' ? 'Liên kết tham gia sẽ được gửi sau khi đăng ký.' : 'The join link will be shared after registration.')
                    }
                  />
                )}

                {eventMode === 'hybrid' && event.location_url && (
                  <VenueRow
                    label={locale === 'vi' ? 'Tuỳ chọn tham gia trực tuyến' : 'Online attendance option'}
                    value={locale === 'vi' ? 'Bạn có thể tham gia từ xa qua liên kết sự kiện.' : 'You can join remotely through the event link.'}
                    linkLabel={locale === 'vi' ? 'Mở liên kết tham gia' : 'Open join link'}
                    href={event.location_url}
                  />
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[28px] bg-white p-6 md:p-7" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <SectionEyebrow>{locale === 'vi' ? 'About this event' : 'About this event'}</SectionEyebrow>
                <h2 className="mt-3 font-heading text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                  {locale === 'vi' ? 'Mọi điều bạn cần biết trước khi tham gia.' : 'Everything to know before you join.'}
                </h2>
                <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-[#3f3f3f]">
                  {event.description}
                </div>
              </div>

              <div className="w-full max-w-xs rounded-[24px] bg-[#f7f7f7] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
                  {locale === 'vi' ? 'Registration snapshot' : 'Registration snapshot'}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#222222]">
                  {registeredCount}
                  {totalCapacity > 0 && <span className="text-xl text-[#6a6a6a]"> / {totalCapacity}</span>}
                </p>
                <p className="mt-1 text-sm text-[#6a6a6a]">
                  {locale === 'vi' ? 'thành viên đã xác nhận tham gia' : 'members confirmed to attend'}
                </p>
                {totalCapacity > 0 && (
                  <>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/8">
                      <div
                        className="h-full rounded-full bg-[#ff385c] transition-all"
                        style={{ width: `${Math.min(100, capacityPercent)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#6a6a6a]">
                      {isFull
                        ? (locale === 'vi' ? 'Hiện tại không còn chỗ trống.' : 'No open seats at the moment.')
                        : (locale === 'vi' ? 'Số chỗ có thể thay đổi theo loại thành viên.' : 'Availability may vary by membership tier.')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {hasFees && isPublished && (
              <div className="mt-8 border-t border-black/5 pt-6">
                <SectionEyebrow>{locale === 'vi' ? 'Pricing' : 'Pricing'}</SectionEyebrow>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {event.fee_premium != null && (
                    <PricingCard
                      title="ABG Premium"
                      value={formatCurrencyVnd(event.fee_premium, locale)}
                      featured={isPremium}
                    />
                  )}
                  {event.fee_basic != null && (
                    <PricingCard
                      title="ABG Basic"
                      value={formatCurrencyVnd(event.fee_basic, locale)}
                      featured={!isPremium}
                    />
                  )}
                  {event.fee_guest != null && (
                    <PricingCard
                      title={locale === 'vi' ? 'Khách' : 'Guest'}
                      value={formatCurrencyVnd(event.fee_guest, locale)}
                    />
                  )}
                </div>
              </div>
            )}
          </section>

          {isPublished && (
            <section
              id="event-rsvp-panel"
              className="rounded-[28px] bg-white p-6 md:p-7"
              style={{ boxShadow: AIRBNB_CARD_SHADOW }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <SectionEyebrow>{locale === 'vi' ? 'Reserve your place' : 'Reserve your place'}</SectionEyebrow>
                  <h2 className="mt-3 font-heading text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                    {locale === 'vi' ? 'Chọn cách bạn muốn tham gia.' : 'Choose how you want to join.'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#6a6a6a]">
                    {locale === 'vi'
                      ? 'Chọn vai trò tham gia phù hợp với bạn. Bạn có thể thay đổi bất kỳ lúc nào trước khi sự kiện diễn ra.'
                      : 'Pick the role that suits you. You can change your mind any time before the event.'}
                  </p>
                </div>

                {myRsvp === 'will_participate' && (
                  <StatusPill tone="plain">
                    {locale === 'vi' ? 'Bạn đã đăng ký tham gia' : 'You are registered to join'}
                  </StatusPill>
                )}
                {myRsvp === 'will_lead' && (
                  <StatusPill tone="sand">
                    {locale === 'vi' ? 'Bạn đang tham gia với vai trò dẫn dắt' : 'You are registered as a lead'}
                  </StatusPill>
                )}
              </div>

              {event.rsvp_score > 0 && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#fff1eb] px-4 py-2 text-sm font-semibold text-[#b42318]">
                  <span>🔥</span>
                  <span>{locale === 'vi' ? 'Điểm cam kết' : 'Commitment'}: {event.rsvp_score}</span>
                </div>
              )}

              {!isPremium && isPremiumExclusive && (
                <NoticeBox>
                  {locale === 'vi'
                    ? 'Sự kiện này chỉ dành cho thành viên Premium. Vui lòng nâng cấp để đăng ký.'
                    : 'This event is reserved for Premium members. Upgrade before registering.'}
                </NoticeBox>
              )}

              {!isPremium && !isPremiumExclusive && (
                <NoticeBox>
                  {locale === 'vi'
                    ? 'Thành viên Basic có thể đăng ký khi còn chỗ. Premium được ưu tiên khi số lượng chỗ có giới hạn.'
                    : 'Basic members can register while seats remain. Premium members receive priority when seats are limited.'}
                </NoticeBox>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                      className={`rounded-[28px] border p-5 text-left transition-all ${
                        isSelected
                          ? 'border-[#ff385c] bg-[#fff8f6]'
                          : 'border-black/8 bg-white hover:border-black/15 hover:bg-[#fcfcfc]'
                      } ${isDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
                      style={!isSelected ? { boxShadow: AIRBNB_CARD_SHADOW } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f7f7] text-xl">
                          {action.icon}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#222222]">
                            {action.label[locale === 'vi' ? 'vi' : 'en']}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#6a6a6a]">
                            {action.helper[locale === 'vi' ? 'vi' : 'en']}
                          </p>
                        </div>
                      </div>

                      {action.level === 'will_lead' && !canUpgradeToLead && (
                        <p className="mt-4 text-xs font-medium leading-5 text-[#6a6a6a]">
                          {locale === 'vi'
                            ? 'Hãy chọn "Tham gia ngay" trước, sau đó bạn có thể nâng cấp lên vai trò tổ chức.'
                            : 'Choose "Join Now" first, then you can upgrade to an organizer role.'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#6a6a6a]">
                {isFull && !hasRsvp && (
                  <span className="font-medium text-[#b42318]">
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
                    className="font-medium text-[#ff385c] transition-colors hover:text-[#e00b41]"
                  >
                    {locale === 'vi' ? 'Hủy đăng ký' : 'Cancel RSVP'}
                  </button>
                )}
              </div>

              {hasRsvp && (
                <p className="mt-3 text-xs leading-6 text-[#6a6a6a]">
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
            <section className="rounded-[28px] bg-white p-6 md:p-7" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
              <SectionEyebrow>{locale === 'vi' ? 'Who is going' : 'Who is going'}</SectionEyebrow>
              <h2 className="mt-3 font-heading text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                {locale === 'vi' ? 'Danh sách thành viên đã đăng ký.' : 'Registered members for this event.'}
              </h2>
              <div className="mt-5 flex flex-wrap gap-3">
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
                        className={`flex items-center gap-3 rounded-full border px-4 py-2.5 ${
                          isLead ? 'border-[#f2d4c9] bg-[#fff8f6]' : 'border-black/8 bg-[#fcfcfc]'
                        }`}
                        title={RSVP_LABELS[rsvp.commitment_level as EventRegistrationLevel]?.[locale === 'vi' ? 'vi' : 'en']}
                      >
                        {rsvp.member_avatar_url ? (
                          <img src={rsvp.member_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(rsvp.member_name || '?')}`}>
                            {(rsvp.member_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[#222222]">
                            {rsvp.member_name || 'Member'}
                          </p>
                          <p className="text-xs text-[#6a6a6a]">
                            {RSVP_LABELS[rsvp.commitment_level as EventRegistrationLevel]?.[locale === 'vi' ? 'vi' : 'en']}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          <section className="rounded-[28px] bg-white p-6 md:p-7" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow>{locale === 'vi' ? 'Discussion' : 'Discussion'}</SectionEyebrow>
                <h2 className="mt-3 font-heading text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                  {locale === 'vi' ? 'Trao đổi trước khi sự kiện bắt đầu.' : 'Talk things through before the event starts.'}
                </h2>
              </div>
              <p className="text-sm text-[#6a6a6a]">
                {event.comment_count} {locale === 'vi' ? 'bình luận' : 'comments'}
              </p>
            </div>

            {session && isPublished && (
              <form onSubmit={handleComment} className="mt-6 rounded-[24px] bg-[#f7f7f7] p-4 sm:p-5">
                <label className="mb-2 block text-sm font-medium text-[#222222]">
                  {locale === 'vi' ? 'Bạn muốn hỏi hoặc chia sẻ gì về sự kiện này?' : 'Questions or notes for the event discussion'}
                </label>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder={locale === 'vi' ? 'Ví dụ: Tôi nên chuẩn bị gì trước khi tham gia?' : 'For example: Is there anything I should prepare before joining?'}
                  className="w-full resize-none rounded-[22px] border border-black/8 bg-white px-4 py-3 text-sm text-[#222222] focus:border-[#ff385c] focus:outline-none"
                  rows={3}
                  maxLength={2000}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={!commentBody.trim() || commentLoading}
                    className="rounded-xl bg-[#ff385c] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#e00b41] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {commentLoading
                      ? (locale === 'vi' ? 'Đang gửi...' : 'Posting...')
                      : (locale === 'vi' ? 'Gửi bình luận' : 'Post Comment')}
                  </button>
                </div>
              </form>
            )}

            {comments.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#6a6a6a]">
                {locale === 'vi' ? 'Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện.' : 'No comments yet. Start the conversation.'}
              </p>
            ) : (
              <div className="mt-6 space-y-4" aria-live="polite">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 rounded-[24px] bg-[#f7f7f7] p-4">
                    {comment.member_avatar_url ? (
                      <img src={comment.member_avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9d9d9] text-sm font-semibold text-white">
                        {(comment.member_name || '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#222222]">{comment.member_name || 'Member'}</span>
                        <span className="text-xs text-[#6a6a6a]">{formatRelativeTime(comment.created_at, locale)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#3f3f3f]">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <aside className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <SectionEyebrow>{locale === 'vi' ? 'Reserve summary' : 'Reserve summary'}</SectionEyebrow>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.03em] text-[#222222]">
                  {registeredCount}
                  {totalCapacity > 0 && <span className="text-xl text-[#6a6a6a]"> / {totalCapacity}</span>}
                </p>
                <p className="mt-1 text-sm text-[#6a6a6a]">
                  {locale === 'vi' ? 'đã xác nhận' : 'confirmed'}
                </p>
              </div>
              {memberFee != null && (
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
                    {locale === 'vi' ? 'Your fee' : 'Your fee'}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#222222]">
                    {formatCurrencyVnd(memberFee, locale)}
                  </p>
                </div>
              )}
            </div>

            {totalCapacity > 0 && (
              <>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-[#ff385c] transition-all"
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6a6a6a]">
                  {isFull
                    ? (locale === 'vi' ? 'Hiện tại không còn chỗ trống.' : 'No open seats at the moment.')
                    : (locale === 'vi' ? 'Số chỗ hiển thị theo tổng sức chứa của sự kiện.' : 'Seats shown reflect the total event capacity.')}
                </p>
              </>
            )}

            <div className="mt-5 space-y-3 rounded-[24px] bg-[#f7f7f7] p-4">
              <MetaLine
                label={locale === 'vi' ? 'Date' : 'Date'}
                value={formatShortDateTime(event.event_date, locale)}
              />
              <MetaLine
                label={locale === 'vi' ? 'Mode' : 'Mode'}
                value={modeLabel}
              />
              <MetaLine
                label={locale === 'vi' ? 'Host' : 'Host'}
                value={event.author_name || 'ABG Alumni'}
              />
            </div>

            {myRsvp === 'will_participate' && (
              <div className="mt-5 space-y-3">
                <StatusPill tone="plain">
                  {locale === 'vi' ? 'Bạn đã đăng ký tham gia' : 'You are registered to join'}
                </StatusPill>
                {memberFee != null && memberFee > 0 && myPaymentStatus === 'confirmed' && (
                  <StatusPill tone="success">{locale === 'vi' ? 'Đã thanh toán' : 'Paid'}</StatusPill>
                )}
                {memberFee != null && memberFee > 0 && myPaymentStatus === 'pending' && (
                  <StatusPill tone="sand">{locale === 'vi' ? 'Chờ xác nhận thanh toán' : 'Payment pending'}</StatusPill>
                )}
                {memberFee != null && memberFee > 0 && !myPaymentStatus && (
                  <button
                    onClick={() => setShowPaymentFlow(true)}
                    className="w-full rounded-xl bg-[#ff385c] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#e00b41]"
                  >
                    {locale === 'vi' ? 'Thanh toán' : 'Pay now'}
                  </button>
                )}
              </div>
            )}

            {myRsvp === 'will_lead' && (
              <div className="mt-5 space-y-3">
                <StatusPill tone="sand">
                  {locale === 'vi' ? 'Bạn đang tham gia với vai trò dẫn dắt' : 'You are registered as a lead'}
                </StatusPill>
                {memberFee != null && memberFee > 0 && myPaymentStatus === 'confirmed' && (
                  <StatusPill tone="success">{locale === 'vi' ? 'Đã thanh toán' : 'Paid'}</StatusPill>
                )}
                {memberFee != null && memberFee > 0 && myPaymentStatus === 'pending' && (
                  <StatusPill tone="sand">{locale === 'vi' ? 'Chờ xác nhận thanh toán' : 'Payment pending'}</StatusPill>
                )}
                {memberFee != null && memberFee > 0 && !myPaymentStatus && (
                  <button
                    onClick={() => setShowPaymentFlow(true)}
                    className="w-full rounded-xl bg-[#ff385c] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#e00b41]"
                  >
                    {locale === 'vi' ? 'Thanh toán' : 'Pay now'}
                  </button>
                )}
              </div>
            )}

            {!hasRsvp && isPublished && (
              <p className="mt-5 text-sm leading-6 text-[#6a6a6a]">
                {locale === 'vi'
                  ? 'Kéo xuống phần đăng ký để chọn vai trò tham gia phù hợp.'
                  : 'Scroll to the RSVP section to choose how you want to join.'}
              </p>
            )}
          </aside>
        </div>
      </div>

      {pendingRsvp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => !rsvpLoading && setPendingRsvp(null)} />
          <div className="relative w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl">
            <h3 className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[#222222]">
              {pendingRsvp === 'will_lead'
                ? (locale === 'vi' ? 'Xác nhận vai trò dẫn dắt' : 'Confirm lead role')
                : (locale === 'vi' ? 'Xác nhận đăng ký tham gia' : 'Confirm registration')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
              {locale === 'vi'
                ? 'Hãy kiểm tra lại thông tin trước khi xác nhận. Bạn có thể thêm ghi chú hoặc câu hỏi cho ban tổ chức nếu cần.'
                : 'Review the event details before confirming. You can add an optional note or question for the organizer.'}
            </p>

            <div className="mt-5 rounded-[24px] bg-[#f7f7f7] p-4 text-sm text-[#3f3f3f]">
              <p><span className="font-medium text-[#222222]">{locale === 'vi' ? 'Sự kiện:' : 'Event:'}</span> {event.title}</p>
              <p className="mt-2"><span className="font-medium text-[#222222]">{locale === 'vi' ? 'Thời gian:' : 'When:'}</span> {formatShortDateTime(event.event_date, locale)}</p>
              <p className="mt-2"><span className="font-medium text-[#222222]">{locale === 'vi' ? 'Hình thức:' : 'Mode:'}</span> {modeLabel}</p>
              <p className="mt-2"><span className="font-medium text-[#222222]">{locale === 'vi' ? 'Phản hồi của bạn:' : 'Your response:'}</span> {RSVP_LABELS[pendingRsvp][locale === 'vi' ? 'vi' : 'en']}</p>
            </div>

            <label className="mt-5 block text-sm font-medium text-[#222222]">
              {locale === 'vi' ? 'Ghi chú hoặc câu hỏi cho ban tổ chức (không bắt buộc)' : 'Note or question for the organizer (optional)'}
            </label>
            <textarea
              value={rsvpNote}
              onChange={(e) => setRsvpNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={locale === 'vi' ? 'Ví dụ: Tôi sẽ đến muộn 10 phút.' : 'For example: I may arrive 10 minutes late.'}
              className="mt-2 w-full resize-none rounded-[22px] border border-black/8 px-4 py-3 text-sm text-[#222222] focus:border-[#ff385c] focus:outline-none"
            />

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRsvp(null)}
                disabled={rsvpLoading}
                className="flex-1 rounded-xl bg-[#f2f2f2] px-4 py-3 text-sm font-medium text-[#222222] transition-colors hover:bg-[#ebebeb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {locale === 'vi' ? 'Quay lại' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => submitRsvp(pendingRsvp)}
                disabled={rsvpLoading}
                className="flex-1 rounded-xl bg-[#ff385c] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#e00b41] disabled:cursor-not-allowed disabled:opacity-50"
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

      {showPaymentFlow && event && session?.user && (() => {
        const isPrem = membershipStatus === 'premium' || membershipStatus === 'grace-period';
        const payerType: PayerType = isPrem ? 'premium' : 'basic';
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[32px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
                <h2 className="font-heading text-xl font-semibold tracking-[-0.03em] text-[#222222]">
                  {locale === 'vi' ? 'Thanh toán phí sự kiện' : 'Event payment'}
                </h2>
                <button onClick={() => setShowPaymentFlow(false)} className="text-xl text-[#6a6a6a] transition-colors hover:text-[#222222]">
                  &times;
                </button>
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

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">
      {children}
    </p>
  );
}

function SoftBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'plain' | 'stone' | 'rose' | 'sand';
}) {
  const classes = {
    plain: 'bg-white text-[#222222] border border-black/8',
    stone: 'bg-[#f7f7f7] text-[#3f3f3f] border border-black/5',
    rose: 'bg-[#fff1eb] text-[#b42318] border border-[#f2d4c9]',
    sand: 'bg-[#fdf4ea] text-[#8a4b14] border border-[#f0ddc3]',
  };

  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'plain' | 'sand' | 'success';
}) {
  const classes = {
    plain: 'bg-[#fff8f6] text-[#b42318] border border-[#f2d4c9]',
    sand: 'bg-[#fdf4ea] text-[#8a4b14] border border-[#f0ddc3]',
    success: 'bg-[#eff8f1] text-[#2d5a3d] border border-[#c9e3d1]',
  };

  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-sm font-medium ${classes[tone]}`}>
      {children}
    </span>
  );
}

function HeroFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] bg-[#fcfcfc] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">{label}</p>
      <div className="mt-2 text-sm font-medium leading-6 text-[#222222]">{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] bg-[#f7f7f7] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">{label}</p>
      <div className="mt-2 text-sm font-medium leading-6 text-[#222222]">{value}</div>
    </div>
  );
}

function DateTimeValue({ date, time }: { date: string; time?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[1.05rem] font-semibold leading-7 tracking-[-0.02em] text-[#222222]">{date}</p>
      {time && <p className="text-sm font-normal leading-5 text-[#6a6a6a]">{time}</p>}
    </div>
  );
}

function VenueRow({
  label,
  value,
  helper,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  helper?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-[24px] bg-[#f7f7f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#222222]">{value}</p>
      {helper && <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">{helper}</p>}
      {href && linkLabel && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-[#ff385c] transition-colors hover:text-[#e00b41]"
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}

function PricingCard({
  title,
  value,
  featured = false,
}: {
  title: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border p-4 ${featured ? 'border-[#f2d4c9] bg-[#fff8f6]' : 'border-black/8 bg-[#fcfcfc]'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">{title}</p>
      <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#222222]">{value}</p>
    </div>
  );
}

function NoticeBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-[24px] border border-[#f0ddc3] bg-[#fdf4ea] px-4 py-3 text-sm leading-6 text-[#8a4b14]">
      {children}
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-[#6a6a6a]">{label}</span>
      <span className="text-right text-sm font-medium leading-6 text-[#222222]">{value}</span>
    </div>
  );
}
