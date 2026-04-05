'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CommunityEvent, EVENT_CATEGORY_LABELS, EVENT_MODE_LABELS, EventMode } from '@/types';
import { GuestRsvpModal } from './guest-rsvp-modal';

const AIRBNB_CARD_SHADOW = 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px';

function formatDateParts(dateStr: string): { date: string; time: string } {
  try {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: dateStr, time: '' };
  }
}

function formatCurrencyVnd(amount: number): string {
  if (amount === 0) return 'Free';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
}

function deriveEventMode(event: CommunityEvent): EventMode {
  if (event.event_mode) return event.event_mode;
  if (event.location && event.location_url) return 'hybrid';
  if (event.location_url) return 'online';
  return 'offline';
}

export function PublicEventDetail({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuestRsvp, setShowGuestRsvp] = useState(false);
  const [guestCount, setGuestCount] = useState(0);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setGuestCount(data.guest_rsvp_count || 0);
      }
    } catch {
      console.error('Failed to fetch event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

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
              <div className="h-64 rounded-[28px] bg-stone-100" />
            </div>
            <div className="h-[360px] rounded-[28px] bg-stone-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-[#222222]">
        <p className="text-[#6a6a6a]">Event not found or not available.</p>
        <Link href="/events" className="mt-3 inline-flex text-sm font-medium text-[#ff385c] hover:text-[#e00b41]">
          Back to events
        </Link>
      </div>
    );
  }

  const eventMode = deriveEventMode(event);
  const modeLabel = EVENT_MODE_LABELS[eventMode].en;
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.en || event.category;
  const hasFees = event.fee_premium != null || event.fee_basic != null || event.fee_guest != null;
  const guestCapacityFull = event.capacity_guest != null && event.capacity_guest > 0 && guestCount >= event.capacity_guest;
  const noGuests = event.capacity_guest === 0;
  const eventStartParts = formatDateParts(event.event_date);
  const eventEndParts = event.event_end_date ? formatDateParts(event.event_end_date) : null;

  return (
    <div className="mx-auto max-w-6xl px-1 py-4 text-[#222222]">
      <nav className="mb-6 text-sm text-[#6a6a6a]">
        <Link href="/events" className="transition-colors hover:text-[#222222]">Events</Link>
        <span className="mx-2">/</span>
        <span className="text-[#222222]">{event.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <SoftBadge tone="stone">{modeLabel}</SoftBadge>
              <SoftBadge tone="plain">{categoryLabel}</SoftBadge>
              {event.is_public && <SoftBadge tone="rose">Public event</SoftBadge>}
            </div>

            <h1 className="mt-5 font-heading text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#222222] md:text-[2.85rem]">
              {event.title}
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#6a6a6a]">
              Key event details at a glance — register as a guest or log in as an ABG member for the full experience.
            </p>
          </section>

          <section className="overflow-hidden rounded-[32px] bg-white" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            {event.image_url ? (
              <div className="aspect-[16/10] bg-[#f7f7f7]">
                <img src={event.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-end bg-[linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#f7f7f7_100%)] p-8">
                <div className="max-w-md">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">Public event</p>
                  <p className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
                    Xem chi tiết sự kiện trước khi đăng ký tham gia.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-black/5 p-5 sm:grid-cols-3 sm:p-6">
              <HeroFact
                label="When"
                value={(
                  <DateTimeValue date={eventStartParts.date} time={eventStartParts.time} />
                )}
              />
              <HeroFact label="Where" value={event.location || (eventMode === 'online' ? 'Online event' : 'To be announced')} />
              <HeroFact
                label="Guest spots"
                value={
                  event.capacity_guest != null && event.capacity_guest > 0
                    ? `${guestCount} / ${event.capacity_guest}`
                    : (noGuests ? 'Members only' : 'Open guest access')
                }
              />
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
              <SectionEyebrow>At a glance</SectionEyebrow>
              <div className="mt-4 grid gap-3">
                <InfoBlock
                  label="Event date"
                  value={<DateTimeValue date={eventStartParts.date} time={eventStartParts.time} />}
                />
                {eventEndParts && (
                  <InfoBlock
                    label="Ends"
                    value={<DateTimeValue date={eventEndParts.date} time={eventEndParts.time} />}
                  />
                )}
                <InfoBlock label="Mode" value={modeLabel} />
                <InfoBlock label="Guest availability" value={noGuests ? 'Members only' : guestCapacityFull ? 'Guest registration full' : 'Guest registration open'} />
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
              <SectionEyebrow>Venue & access</SectionEyebrow>
              <div className="mt-4 space-y-4">
                <VenueRow
                  label={eventMode === 'online' ? 'Join online' : 'Location'}
                  value={event.location || (eventMode === 'online' ? 'Online event' : 'To be announced')}
                  href={event.location_url || undefined}
                  linkLabel={event.location_url ? (eventMode === 'online' ? 'Open join link' : 'View on map') : undefined}
                />
                <VenueRow
                  label="Member access"
                  value="ABG members can log in for the full RSVP, payment, and discussion experience."
                  href="/login"
                  linkLabel="Log in as member"
                  internal
                />
              </div>
            </section>
          </div>

          <section className="rounded-[28px] bg-white p-6 md:p-7" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <SectionEyebrow>About this event</SectionEyebrow>
            <h2 className="mt-3 font-heading text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] text-[#222222]">
              What to expect before you register.
            </h2>
            <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-[#3f3f3f]">
              {event.description}
            </div>

            {hasFees && (
              <div className="mt-8 border-t border-black/5 pt-6">
                <SectionEyebrow>Pricing</SectionEyebrow>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {event.fee_premium != null && (
                    <PricingCard title="ABG Premium" value={formatCurrencyVnd(event.fee_premium)} />
                  )}
                  {event.fee_basic != null && (
                    <PricingCard title="ABG Basic" value={formatCurrencyVnd(event.fee_basic)} />
                  )}
                  {event.fee_guest != null && (
                    <PricingCard title="Guest" value={formatCurrencyVnd(event.fee_guest)} featured />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <SectionEyebrow>Guest registration</SectionEyebrow>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.03em] text-[#222222]">
                  {event.capacity_guest != null && event.capacity_guest > 0 ? `${guestCount} / ${event.capacity_guest}` : guestCount}
                </p>
                <p className="mt-1 text-sm text-[#6a6a6a]">
                  {event.capacity_guest != null && event.capacity_guest > 0 ? 'guest spots used' : 'guest registrations'}
                </p>
              </div>
              {event.fee_guest != null && (
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">Guest fee</p>
                  <p className="mt-1 text-base font-semibold text-[#222222]">{formatCurrencyVnd(event.fee_guest)}</p>
                </div>
              )}
            </div>

            {noGuests ? (
              <NoticeBox>
                This event is for ABG members only. <Link href="/login" className="font-medium text-[#ff385c] hover:text-[#e00b41]">Log in</Link> or <Link href="/onboard" className="font-medium text-[#ff385c] hover:text-[#e00b41]">apply for membership</Link>.
              </NoticeBox>
            ) : guestCapacityFull ? (
              <NoticeBox tone="rose">
                Guest registration is full. <Link href="/login" className="font-medium text-[#ff385c] hover:text-[#e00b41]">Log in</Link> as an ABG member to check member seats.
              </NoticeBox>
            ) : (
              <>
                <p className="mt-5 text-sm leading-6 text-[#6a6a6a]">
                  Register as a guest to attend this event. ABG members can <Link href="/login" className="font-medium text-[#ff385c] hover:text-[#e00b41]">log in</Link> for the full event experience.
                </p>
                <button
                  onClick={() => setShowGuestRsvp(true)}
                  className="mt-5 w-full rounded-xl bg-[#ff385c] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#e00b41]"
                >
                  Register as guest
                </button>
              </>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-6" style={{ boxShadow: AIRBNB_CARD_SHADOW }}>
            <SectionEyebrow>ABG member access</SectionEyebrow>
            <div className="mt-4 space-y-3 rounded-[24px] bg-[#f7f7f7] p-4">
              <MetaLine label="Member RSVP" value="Available after login" />
              <MetaLine label="Payments" value="Handled in member flow" />
              <MetaLine label="Discussion" value="Visible to members" />
            </div>
            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[#222222] transition-colors hover:bg-[#f7f7f7]"
            >
              Log in
            </Link>
          </section>
        </div>
      </div>

      {showGuestRsvp && (
        <GuestRsvpModal
          event={event}
          onClose={() => setShowGuestRsvp(false)}
          onSuccess={fetchEvent}
        />
      )}
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
  tone: 'plain' | 'stone' | 'rose';
}) {
  const classes = {
    plain: 'bg-white text-[#222222] border border-black/8',
    stone: 'bg-[#f7f7f7] text-[#3f3f3f] border border-black/5',
    rose: 'bg-[#fff1eb] text-[#b42318] border border-[#f2d4c9]',
  };

  return (
    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-semibold ${classes[tone]}`}>
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
  href,
  linkLabel,
  internal = false,
}: {
  label: string;
  value: string;
  href?: string;
  linkLabel?: string;
  internal?: boolean;
}) {
  return (
    <div className="rounded-[24px] bg-[#f7f7f7] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6a6a6a]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#222222]">{value}</p>
      {href && linkLabel && !internal && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-[#ff385c] transition-colors hover:text-[#e00b41]"
        >
          {linkLabel}
        </a>
      )}
      {href && linkLabel && internal && (
        <Link href={href} className="mt-3 inline-flex text-sm font-medium text-[#ff385c] transition-colors hover:text-[#e00b41]">
          {linkLabel}
        </Link>
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

function NoticeBox({
  children,
  tone = 'sand',
}: {
  children: React.ReactNode;
  tone?: 'sand' | 'rose';
}) {
  return (
    <div className={`mt-5 rounded-[24px] px-4 py-3 text-sm leading-6 ${
      tone === 'rose'
        ? 'border border-[#f2d4c9] bg-[#fff1eb] text-[#b42318]'
        : 'border border-[#f0ddc3] bg-[#fdf4ea] text-[#8a4b14]'
    }`}>
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
