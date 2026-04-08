'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { linkifyText } from '@/lib/linkify';
import { useTranslation } from '@/lib/i18n';
import { CommunityEvent, EVENT_CATEGORY_LABELS, EVENT_MODE_LABELS, EventMode } from '@/types';
import { GuestRsvpModal } from './guest-rsvp-modal';

function formatDateTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
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
  const { locale } = useTranslation();
  const vi = locale === 'vi';

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
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
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded-3xl" />
        <div className="h-32 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">{vi ? 'Không tìm thấy sự kiện.' : 'Event not found or not available.'}</p>
        <Link href="/events" className="text-blue-600 hover:underline mt-2 inline-block">{vi ? 'Quay lại' : 'Back to events'}</Link>
      </div>
    );
  }

  const eventMode = deriveEventMode(event);
  const modeLabel = EVENT_MODE_LABELS[eventMode][vi ? 'vi' : 'en'];
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[vi ? 'vi' : 'en'] || event.category;
  const hasFees = event.fee_premium != null || event.fee_basic != null || event.fee_guest != null;
  const guestCapacityFull = event.capacity_guest != null && event.capacity_guest > 0 && guestCount >= event.capacity_guest;
  const noGuests = event.capacity_guest === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/events" className="hover:text-blue-600">{vi ? 'Sự kiện' : 'Events'}</Link>
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
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{modeLabel}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{categoryLabel}</span>
          {event.is_public && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{vi ? 'Sự kiện công khai' : 'Public Event'}</span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
      </div>

      {/* Event Info */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="text-xl">📅</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatDateTime(event.event_date, locale)}</p>
              {event.event_end_date && (
                <p className="text-xs text-gray-500">{vi ? 'đến' : 'to'} {formatDateTime(event.event_end_date, locale)}</p>
              )}
            </div>
          </div>
          {event.location && (
            <div className="flex items-start gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{event.location}</p>
                {event.location_url && (
                  <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{vi ? 'Xem bản đồ' : 'View on map'}</a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{vi ? 'Giới thiệu sự kiện' : 'About This Event'}</h2>
        <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800 break-all" target="_blank" rel="noopener noreferrer">{children}</a> }}>{linkifyText(event.description)}</ReactMarkdown></div>
      </section>

      {/* Fee Pricing */}
      {hasFees && (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{vi ? 'Phí tham gia' : 'Event Fees'}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {event.fee_premium != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">ABG Premium</p>
                <p className="text-xl font-bold text-gray-900">
                  {event.fee_premium === 0 ? (vi ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_premium)} VND`}
                </p>
              </div>
            )}
            {event.fee_basic != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 mb-1">ABG Basic</p>
                <p className="text-xl font-bold text-gray-900">
                  {event.fee_basic === 0 ? (vi ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_basic)} VND`}
                </p>
              </div>
            )}
            {event.fee_guest != null && (
              <div className="rounded-2xl border border-stone-200 p-4 text-center bg-blue-50 border-blue-200">
                <p className="text-xs font-medium text-blue-600 mb-1">{vi ? 'Khách' : 'Guest'}</p>
                <p className="text-xl font-bold text-blue-900">
                  {event.fee_guest === 0 ? (vi ? 'Miễn phí' : 'Free') : `${new Intl.NumberFormat('vi-VN').format(event.fee_guest)} VND`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Attendance count */}
      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="font-medium">{event.rsvp_count + guestCount}</span> {vi ? 'đã tham gia' : 'joined'}
        </div>
      </section>

      {/* Guest Registration — only for public events with guest slots */}
      {event.is_public ? (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{vi ? 'Tham gia sự kiện' : 'Join This Event'}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {vi
              ? <>Đăng ký với tư cách khách để tham gia sự kiện này. Thành viên ABG có thể <Link href="/login" className="text-blue-600 hover:underline">đăng nhập</Link> để truy cập đầy đủ.</>
              : <>Register as a guest to attend this event. ABG members can <Link href="/login" className="text-blue-600 hover:underline">log in</Link> for full access.</>}
          </p>

          {event.registration_closed || (event.registration_deadline && new Date(event.registration_deadline) < new Date()) ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {vi ? 'Đăng ký đã đóng cho sự kiện này.' : 'Registration is closed for this event.'}
            </div>
          ) : noGuests ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {vi
                ? <>Sự kiện này chỉ dành cho thành viên ABG. <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link> hoặc <Link href="/onboard" className="text-blue-600 hover:underline">đăng ký thành viên</Link>.</>
                : <>This event is for ABG members only. <Link href="/login" className="text-blue-600 hover:underline">Log in</Link> or <Link href="/onboard" className="text-blue-600 hover:underline">apply for membership</Link>.</>}
            </div>
          ) : guestCapacityFull ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {vi
                ? <>Đăng ký khách đã đầy. <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link> với tư cách thành viên ABG để kiểm tra chỗ còn trống.</>
                : <>Guest registration is full. <Link href="/login" className="text-blue-600 hover:underline">Log in</Link> as an ABG member to check member seats.</>}
            </div>
          ) : (
            <button
              onClick={() => setShowGuestRsvp(true)}
              className="w-full md:w-auto px-8 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-colors"
            >
              {vi ? 'Đăng ký với tư cách Khách' : 'Register as Guest'}
            </button>
          )}

          {event.capacity_guest != null && event.capacity_guest > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              {vi ? 'Chỗ dành cho khách' : 'Guest spots'}: {guestCount} / {event.capacity_guest}
            </p>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{vi ? 'Bạn muốn tham gia?' : 'Want to Join?'}</h2>
          <p className="text-sm text-gray-600 mb-3">
            {vi
              ? <>Sự kiện này dành cho thành viên ABG. <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link> hoặc <Link href="/onboard" className="text-blue-600 hover:underline">đăng ký thành viên</Link> để tham gia.</>
              : <>This event is for ABG members. <Link href="/login" className="text-blue-600 hover:underline">Log in</Link> or <Link href="/onboard" className="text-blue-600 hover:underline">apply for membership</Link> to register.</>}
          </p>
          <p className="text-sm text-gray-500">
            {vi
              ? <>Nếu bạn từng là học viên của Viện, bạn đã có tài khoản. Chỉ cần <Link href="/login" className="text-blue-600 hover:underline">đăng nhập</Link> bằng email đã đăng ký với Viện, hoặc <Link href="/onboard" className="text-blue-600 hover:underline">tạo tài khoản mới</Link> nếu không nhớ email.</>
              : <>If you were a student at the Institute, you already have an account. Simply <Link href="/login" className="text-blue-600 hover:underline">log in</Link> with the email you registered with the Institute, or <Link href="/onboard" className="text-blue-600 hover:underline">create a new account</Link> if you don&apos;t remember your email.</>}
          </p>
          <p className="mt-3 text-xs text-gray-400">
            {vi
              ? <>Tìm hiểu thêm về Viện Lãnh đạo ABG tại <a href="https://abg.edu.vn" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">abg.edu.vn</a>.</>
              : <>Learn more about ABG Leadership Institute at <a href="https://abg.edu.vn" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">abg.edu.vn</a>.</>}
          </p>
        </section>
      )}

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
