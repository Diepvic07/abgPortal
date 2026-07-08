'use client';

import { useState, useEffect, useRef } from 'react';
import { EventPayment, EventGuestRsvp, EventPaymentStatus, Member, getMembershipStatus } from '@/types';
import { useTranslation } from '@/lib/i18n';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled_no_refund: 'bg-orange-100 text-orange-800',
  refunded: 'bg-gray-200 text-gray-700',
};

type FilterKey = 'active' | 'cancelled_no_refund' | 'refunded' | 'rejected';

type PendingParticipant = {
  kind: 'member' | 'guest';
  member_id?: string;
  guest_rsvp_id?: string;
  name: string;
  email?: string;
  abg_class?: string;
  avatar_url?: string;
  pending_payment_id: string | null;
  created_at: string;
};

function statusLabel(locale: string, status: EventPaymentStatus): string {
  if (locale !== 'vi') return status.replace(/_/g, ' ');
  switch (status) {
    case 'pending': return 'Chờ xử lý';
    case 'confirmed': return 'Đã xác nhận';
    case 'rejected': return 'Từ chối';
    case 'cancelled_no_refund': return 'Đã huỷ · giữ tiền';
    case 'refunded': return 'Đã hoàn tiền';
  }
}

export function AdminEventPayments({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const { t, locale } = useTranslation();
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<PendingParticipant[]>([]);
  const [guestRsvps, setGuestRsvps] = useState<EventGuestRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [eventGroupUrl, setEventGroupUrl] = useState<string | null>(null);
  const [eventGroupLabel, setEventGroupLabel] = useState<string | null>(null);
  const [eventFees, setEventFees] = useState<{ premium: number | null; basic: number | null; guest: number | null }>({ premium: null, basic: null, guest: null });
  // Which pending payment row is currently showing the inline group-link prompt
  const [promptingPaymentId, setPromptingPaymentId] = useState<string | null>(null);
  const [promptUrl, setPromptUrl] = useState('');
  const [promptLabel, setPromptLabel] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('active');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const PAYER_TYPE_LABELS: Record<string, string> = {
    premium: t.admin.labels.premium,
    basic: t.admin.labels.basic,
    guest: t.admin.labels.guest,
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpenId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [paymentsRes, guestRes] = await Promise.all([
        fetch(`/api/admin/community/events/${eventId}/payments`),
        fetch(`/api/admin/community/events/${eventId}/guest-rsvps`),
      ]);
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
        setPendingParticipants(data.pending_participants || []);
        setEventGroupUrl(data.community_group_url || null);
        setEventGroupLabel(data.community_group_label || null);
        setEventFees({
          premium: data.fee_premium ?? null,
          basic: data.fee_basic ?? null,
          guest: data.fee_guest ?? null,
        });
      }
      if (guestRes.ok) {
        const data = await guestRes.json();
        setGuestRsvps(data.guest_rsvps || []);
      }
    } catch {
      console.error('Failed to fetch event payment data');
    } finally {
      setLoading(false);
    }
  }

  function isValidUrl(value: string): boolean {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async function submitConfirm(paymentId: string, opts?: { groupUrl?: string; groupLabel?: string }) {
    setActionLoading(paymentId);
    setMessage(null);
    setPromptError(null);
    try {
      const payload: Record<string, unknown> = { payment_id: paymentId, status: 'confirmed' };
      const editedAmount = editAmounts[paymentId];
      if (editedAmount && parseInt(editedAmount) > 0) {
        payload.amount_vnd = parseInt(editedAmount);
      }
      if (opts?.groupUrl) payload.community_group_url = opts.groupUrl;
      if (opts?.groupLabel) payload.community_group_label = opts.groupLabel;

      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ text: (t.admin.eventPayments.paymentStatus as string).replace('{status}', 'confirmed'), type: 'success' });
        setPromptingPaymentId(null);
        setPromptUrl('');
        setPromptLabel('');
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setMessage({ text: data?.error || t.admin.messages.failed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePaymentAction(paymentId: string, status: 'confirmed' | 'rejected') {
    if (status === 'confirmed' && !eventGroupUrl) {
      setPromptingPaymentId(paymentId);
      setPromptUrl('');
      setPromptLabel('');
      setPromptError(null);
      setMessage(null);
      return;
    }

    if (status === 'confirmed') {
      await submitConfirm(paymentId);
      return;
    }

    setActionLoading(paymentId);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { payment_id: paymentId, status };
      const editedAmount = editAmounts[paymentId];
      if (editedAmount && parseInt(editedAmount) > 0) {
        payload.amount_vnd = parseInt(editedAmount);
      }
      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ text: (t.admin.eventPayments.paymentStatus as string).replace('{status}', status), type: 'success' });
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setMessage({ text: data?.error || t.admin.messages.failed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function submitPrompt(paymentId: string, mode: 'with-link' | 'skip') {
    if (mode === 'with-link') {
      const url = promptUrl.trim();
      const label = promptLabel.trim();
      if (!url || !isValidUrl(url)) {
        setPromptError(locale === 'vi'
          ? 'Vui lòng nhập đường dẫn hợp lệ (bắt đầu bằng http:// hoặc https://).'
          : 'Please enter a valid URL (starting with http:// or https://).');
        return;
      }
      await submitConfirm(paymentId, { groupUrl: url, groupLabel: label });
    } else {
      await submitConfirm(paymentId);
    }
  }

  async function patchStatus(paymentId: string, status: EventPaymentStatus, opts?: { cancellationNote?: string }) {
    setActionLoading(paymentId);
    setMessage(null);
    setMenuOpenId(null);
    try {
      const payload: Record<string, unknown> = { payment_id: paymentId, status };
      if (opts?.cancellationNote !== undefined) payload.cancellation_note = opts.cancellationNote;
      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ text: (t.admin.eventPayments.paymentStatus as string).replace('{status}', status), type: 'success' });
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setMessage({ text: data?.error || t.admin.messages.failed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUnpaid(target: { payment_id?: string; member_id?: string; guest_rsvp_id?: string }, actionKey: string) {
    if (!confirm(locale === 'vi'
      ? 'Xoá đăng ký chưa thanh toán này? Không thể hoàn tác.'
      : 'Delete this unpaid registration? This cannot be undone.')) return;
    setActionLoading(actionKey);
    setMessage(null);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      if (res.ok) {
        setMessage({
          text: locale === 'vi' ? 'Đã xoá đăng ký.' : 'Registration removed.',
          type: 'success',
        });
        await fetchData();
      } else {
        const data = await res.json().catch(() => null);
        setMessage({ text: data?.error || t.admin.messages.failed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-3"><div className="h-6 bg-gray-200 rounded w-1/3" /><div className="h-32 bg-gray-200 rounded" /></div>;
  }

  const confirmedList = payments.filter(p => p.status === 'confirmed');
  const cancelledKeptList = payments.filter(p => p.status === 'cancelled_no_refund');
  const refundedList = payments.filter(p => p.status === 'refunded');
  const rejectedList = payments.filter(p => p.status === 'rejected');

  const confirmedTotal = confirmedList.reduce((s, p) => s + p.amount_vnd, 0);
  const cancelledKeptTotal = cancelledKeptList.reduce((s, p) => s + p.amount_vnd, 0);
  const refundedTotal = refundedList.reduce((s, p) => s + p.amount_vnd, 0);
  const revenueTotal = confirmedTotal + cancelledKeptTotal;

  const filterCounts: Record<FilterKey, number> = {
    active: confirmedList.length,
    cancelled_no_refund: cancelledKeptList.length,
    refunded: refundedList.length,
    rejected: rejectedList.length,
  };

  const filterPayments = (() => {
    switch (filter) {
      case 'active': return confirmedList;
      case 'cancelled_no_refund': return cancelledKeptList;
      case 'refunded': return refundedList;
      case 'rejected': return rejectedList;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t.admin.eventPayments.title} — {eventTitle}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {locale === 'vi' ? '+ Thêm người đã thanh toán' : '+ Add paid participant'}
          </button>
          <button onClick={fetchData} className="text-xs text-blue-600 hover:underline">{t.admin.actions.refresh}</button>
        </div>
      </div>

      {/* Revenue Summary */}
      {(payments.length > 0 || pendingParticipants.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 font-medium">{t.admin.eventPayments.confirmed}</p>
            <p className="text-lg font-bold text-green-800">{new Intl.NumberFormat('vi-VN').format(confirmedTotal)}</p>
            <p className="text-xs text-green-600">{confirmedList.length} {t.admin.eventPayments.paymentsCount}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">{t.admin.eventPayments.pending}</p>
            <p className="text-lg font-bold text-amber-800">{pendingParticipants.length}</p>
            <p className="text-xs text-amber-600">{locale === 'vi' ? 'người chưa xác nhận' : 'unpaid participants'}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-700 font-medium">{locale === 'vi' ? 'Đã huỷ · giữ tiền' : 'Cancelled · kept'}</p>
            <p className="text-lg font-bold text-orange-800">{new Intl.NumberFormat('vi-VN').format(cancelledKeptTotal)}</p>
            <p className="text-xs text-orange-700">{cancelledKeptList.length} {t.admin.eventPayments.paymentsCount}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">{locale === 'vi' ? 'Doanh thu' : 'Revenue'}</p>
            <p className="text-lg font-bold text-blue-800">{new Intl.NumberFormat('vi-VN').format(revenueTotal)}</p>
            <p className="text-xs text-blue-600">
              {locale === 'vi' ? 'chưa trừ hoàn' : 'before refunds'}
              {refundedTotal > 0 ? ` · −${new Intl.NumberFormat('vi-VN').format(refundedTotal)}` : ''}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {eventGroupUrl && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-semibold">
            {locale === 'vi' ? 'Nhóm trao đổi:' : 'Community group:'}
          </span>{' '}
          {eventGroupLabel ? <span>{eventGroupLabel} · </span> : null}
          <a href={eventGroupUrl} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {eventGroupUrl}
          </a>
          <p className="mt-1 text-xs text-blue-700">
            {locale === 'vi'
              ? 'Liên kết này sẽ được gửi kèm trong mọi email xác nhận thanh toán tiếp theo.'
              : 'This link is included in every future payment confirmation email.'}
          </p>
        </div>
      )}

      {/* Pending participants: unpaid RSVPs + pending event_payments */}
      {pendingParticipants.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-800 mb-1">
            {locale === 'vi' ? 'Chờ thanh toán' : 'Awaiting payment'} ({pendingParticipants.length})
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            {locale === 'vi'
              ? 'Đã đăng ký nhưng chưa xác nhận thanh toán. Nếu họ không đến, hãy xoá khỏi danh sách. Nếu họ đã chuyển khoản, hãy xác nhận hoặc thêm thủ công qua "+ Thêm người đã thanh toán".'
              : 'Registered but payment not confirmed. Delete no-shows, or confirm/add manually if they actually paid.'}
          </p>
          <div className="space-y-3">
            {pendingParticipants.map((pp) => {
              const payment = pp.pending_payment_id
                ? payments.find(p => p.id === pp.pending_payment_id)
                : undefined;
              const key = pp.pending_payment_id || pp.member_id || pp.guest_rsvp_id!;
              const busy = actionLoading === key;
              return (
                <div key={key} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900">{pp.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {pp.kind === 'guest' ? PAYER_TYPE_LABELS.guest : (pp.abg_class || t.admin.labels.basic)}
                        </span>
                        {payment ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {locale === 'vi' ? 'Đã báo đã trả' : 'Claimed paid'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {locale === 'vi' ? 'Chỉ đăng ký' : 'RSVP only'}
                          </span>
                        )}
                      </div>
                      {pp.email && <p className="text-sm text-gray-600">{pp.email}</p>}
                      {payment && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            min="0"
                            value={editAmounts[payment.id] ?? String(payment.amount_vnd)}
                            onChange={(e) => setEditAmounts(prev => ({ ...prev, [payment.id]: e.target.value }))}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-900"
                          />
                          <span className="text-sm text-gray-500">{t.admin.eventPayments.vnd}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(pp.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {payment && (
                        <button
                          onClick={() => handlePaymentAction(payment.id, 'confirmed')}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {t.admin.actions.confirm}
                        </button>
                      )}
                      <button
                        onClick={() => deleteUnpaid(
                          payment
                            ? { payment_id: payment.id }
                            : pp.kind === 'member'
                              ? { member_id: pp.member_id! }
                              : { guest_rsvp_id: pp.guest_rsvp_id! },
                          key,
                        )}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title={locale === 'vi' ? 'Xoá đăng ký (không thanh toán)' : 'Delete unpaid registration'}
                      >
                        {locale === 'vi' ? 'Xoá' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {payment && promptingPaymentId === payment.id && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {locale === 'vi'
                          ? 'Thêm nhóm trao đổi (tuỳ chọn)'
                          : 'Add a community group link (optional)'}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {locale === 'vi'
                          ? 'Đây là lần xác nhận thanh toán đầu tiên cho sự kiện này. Nếu bạn cung cấp đường dẫn nhóm Zalo / Facebook / Telegram, mọi email xác nhận tiếp theo sẽ tự động kèm theo liên kết này.'
                          : 'This is the first payment confirmation for this event. If you provide a Zalo / Facebook / Telegram group link, every future confirmation email will include it automatically.'}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            {locale === 'vi' ? 'Đường dẫn nhóm' : 'Group URL'}
                          </label>
                          <input
                            type="url"
                            value={promptUrl}
                            onChange={(e) => setPromptUrl(e.target.value)}
                            placeholder="https://zalo.me/g/xxxxx"
                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            {locale === 'vi' ? 'Tên hiển thị (tuỳ chọn)' : 'Display label (optional)'}
                          </label>
                          <input
                            type="text"
                            value={promptLabel}
                            onChange={(e) => setPromptLabel(e.target.value)}
                            placeholder={locale === 'vi' ? 'Nhóm Zalo sự kiện' : 'Event Zalo group'}
                            maxLength={120}
                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                      {promptError && (
                        <p className="mt-2 text-xs text-red-600">{promptError}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => submitPrompt(payment.id, 'with-link')}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {locale === 'vi' ? 'Xác nhận & lưu nhóm' : 'Confirm & save group'}
                        </button>
                        <button
                          onClick={() => submitPrompt(payment.id, 'skip')}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          {locale === 'vi' ? 'Xác nhận, bỏ qua nhóm' : 'Confirm without group'}
                        </button>
                        <button
                          onClick={() => { setPromptingPaymentId(null); setPromptError(null); }}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          {locale === 'vi' ? 'Huỷ' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participant list with filter chips */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-gray-700">
            {locale === 'vi' ? 'Danh sách người tham gia' : 'Participant list'}
          </h4>
          <div className="flex flex-wrap gap-1">
            {([
              ['active', locale === 'vi' ? 'Đang tham gia' : 'Attending'],
              ['cancelled_no_refund', locale === 'vi' ? 'Đã huỷ · giữ tiền' : 'Cancelled · kept'],
              ['refunded', locale === 'vi' ? 'Đã hoàn tiền' : 'Refunded'],
              ['rejected', locale === 'vi' ? 'Từ chối' : 'Rejected'],
            ] as Array<[FilterKey, string]>).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  filter === key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {label} ({filterCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {filterPayments.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            {locale === 'vi' ? 'Không có mục nào trong bộ lọc này.' : 'Nothing in this filter.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filterPayments.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">{p.payer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{statusLabel(locale, p.status)}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{PAYER_TYPE_LABELS[p.payer_type]}</span>
                    </div>
                    <p className="text-xs text-gray-500">{p.payer_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        value={editAmounts[p.id] ?? String(p.amount_vnd)}
                        onChange={(e) => setEditAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-28 px-2 py-0.5 border border-gray-200 rounded text-xs font-medium text-gray-700"
                        disabled={p.status === 'refunded'}
                      />
                      <span className="text-xs text-gray-400">{t.admin.eventPayments.vnd}</span>
                      {editAmounts[p.id] && parseInt(editAmounts[p.id]) !== p.amount_vnd && p.status !== 'refunded' && (
                        <button
                          onClick={() => handlePaymentAction(p.id, p.status === 'rejected' ? 'rejected' : 'confirmed')}
                          disabled={actionLoading === p.id}
                          className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {t.admin.actions.save}
                        </button>
                      )}
                    </div>
                    {p.cancellation_note && (
                      <p className="mt-1 text-xs text-orange-700 italic">
                        {locale === 'vi' ? 'Ghi chú huỷ: ' : 'Cancel note: '}{p.cancellation_note}
                      </p>
                    )}
                  </div>
                  <div className="relative shrink-0" ref={menuOpenId === p.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                      disabled={actionLoading === p.id}
                      className="text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      aria-label="Actions"
                    >
                      ⋯
                    </button>
                    {menuOpenId === p.id && (
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 text-sm">
                        {p.status === 'confirmed' && (
                          <>
                            <MenuItem
                              onClick={() => {
                                const note = prompt(locale === 'vi' ? 'Ghi chú (tuỳ chọn):' : 'Note (optional):') ?? undefined;
                                if (note === undefined) return; // cancelled
                                patchStatus(p.id, 'refunded', { cancellationNote: note });
                              }}
                              label={locale === 'vi' ? 'Xoá & hoàn tiền' : 'Remove & refund'}
                              hint={locale === 'vi' ? 'Trừ khỏi doanh thu' : 'Excluded from revenue'}
                            />
                            <MenuItem
                              onClick={() => {
                                const note = prompt(locale === 'vi' ? 'Lý do huỷ (tuỳ chọn):' : 'Cancellation reason (optional):') ?? undefined;
                                if (note === undefined) return;
                                patchStatus(p.id, 'cancelled_no_refund', { cancellationNote: note });
                              }}
                              label={locale === 'vi' ? 'Xoá không hoàn tiền' : 'Remove, keep money'}
                              hint={locale === 'vi' ? 'Vẫn tính vào doanh thu' : 'Counts toward revenue'}
                            />
                          </>
                        )}
                        {p.status === 'cancelled_no_refund' && (
                          <>
                            <MenuItem
                              onClick={() => {
                                if (!confirm(locale === 'vi'
                                  ? 'Chuyển sang đã hoàn tiền? Sẽ trừ khỏi doanh thu.'
                                  : 'Mark as refunded? This removes it from revenue.')) return;
                                patchStatus(p.id, 'refunded');
                              }}
                              label={locale === 'vi' ? 'Đánh dấu đã hoàn tiền' : 'Mark refunded'}
                              hint={locale === 'vi' ? 'Sau khi thực sự chuyển trả' : 'After you actually paid back'}
                            />
                            <MenuItem
                              onClick={() => {
                                if (!confirm(locale === 'vi'
                                  ? 'Khôi phục về danh sách tham gia?'
                                  : 'Restore to participant list?')) return;
                                patchStatus(p.id, 'confirmed');
                              }}
                              label={locale === 'vi' ? 'Khôi phục tham gia' : 'Restore attendance'}
                            />
                          </>
                        )}
                        {p.status === 'refunded' && (
                          <MenuItem
                            onClick={() => {
                              if (!confirm(locale === 'vi'
                                ? 'Khôi phục về danh sách tham gia?'
                                : 'Restore to participant list?')) return;
                              patchStatus(p.id, 'confirmed');
                            }}
                            label={locale === 'vi' ? 'Khôi phục tham gia' : 'Restore attendance'}
                          />
                        )}
                        {p.status === 'rejected' && (
                          <MenuItem
                            onClick={() => patchStatus(p.id, 'confirmed')}
                            label={locale === 'vi' ? 'Xác nhận lại' : 'Re-confirm'}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {payments.length === 0 && (
        <p className="text-sm text-gray-500">{t.admin.eventPayments.noPayments}</p>
      )}

      {/* Guest RSVPs — kept for backwards-compat visibility */}
      {guestRsvps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">{t.admin.eventPayments.guestRegistrations} ({guestRsvps.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4">{t.admin.labels.name}</th>
                  <th className="pb-2 pr-4">{t.admin.labels.email}</th>
                  <th className="pb-2 pr-4">{t.admin.labels.phone}</th>
                  <th className="pb-2">{t.admin.eventPayments.registered}</th>
                </tr>
              </thead>
              <tbody>
                {guestRsvps.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">{g.guest_name}</td>
                    <td className="py-2 pr-4 text-gray-600">{g.guest_email}</td>
                    <td className="py-2 pr-4 text-gray-600">{g.guest_phone || '—'}</td>
                    <td className="py-2 text-gray-500 text-xs">
                      {new Date(g.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddParticipantModal
          eventId={eventId}
          fees={eventFees}
          locale={locale}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function MenuItem({ onClick, label, hint }: { onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-gray-50"
    >
      <span className="block text-gray-900">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
    </button>
  );
}

function AddParticipantModal({
  eventId,
  fees,
  locale,
  onClose,
  onCreated,
}: {
  eventId: string;
  fees: { premium: number | null; basic: number | null; guest: number | null };
  locale: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<'member' | 'guest'>('member');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [searching, setSearching] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill amount from event fees when mode/selection changes.
  useEffect(() => {
    if (mode === 'guest') {
      if (fees.guest != null) setAmount(String(fees.guest));
    } else if (selected) {
      const isPremium = getMembershipStatus(selected) === 'premium';
      const fee = isPremium ? fees.premium : fees.basic;
      if (fee != null) setAmount(String(fee));
    }
  }, [mode, selected, fees]);

  // Debounced member search
  useEffect(() => {
    if (mode !== 'member') return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/members/search?name=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) setResults((data.members || []).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, mode]);

  async function submit() {
    setError(null);
    const amt = parseInt(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError(locale === 'vi' ? 'Nhập số tiền hợp lệ.' : 'Enter a valid amount.');
      return;
    }
    const payload: Record<string, unknown> = { amount_vnd: amt };
    if (mode === 'member') {
      if (!selected) {
        setError(locale === 'vi' ? 'Chọn một thành viên.' : 'Select a member.');
        return;
      }
      payload.member_id = selected.id;
    } else {
      if (!guestName.trim() || !guestEmail.trim()) {
        setError(locale === 'vi' ? 'Nhập họ tên và email khách.' : 'Enter guest name and email.');
        return;
      }
      payload.guest_name = guestName.trim();
      payload.guest_email = guestEmail.trim();
      if (guestPhone.trim()) payload.guest_phone = guestPhone.trim();
    }
    if (note.trim()) payload.notes = note.trim();

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || (locale === 'vi' ? 'Không thể thêm.' : 'Failed to add.'));
      }
    } catch {
      setError(locale === 'vi' ? 'Có lỗi xảy ra.' : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            {locale === 'vi' ? 'Thêm người đã thanh toán' : 'Add paid participant'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('member'); setError(null); }}
            className={`text-sm px-3 py-1.5 rounded-lg border ${mode === 'member' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {locale === 'vi' ? 'Thành viên' : 'Member'}
          </button>
          <button
            onClick={() => { setMode('guest'); setSelected(null); setError(null); }}
            className={`text-sm px-3 py-1.5 rounded-lg border ${mode === 'guest' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {locale === 'vi' ? 'Khách' : 'Guest'}
          </button>
        </div>

        {mode === 'member' ? (
          <div className="space-y-2">
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-600">{selected.email}{selected.abg_class ? ` · ${selected.abg_class}` : ''}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery(''); }} className="text-xs text-gray-500 hover:text-gray-800">
                  {locale === 'vi' ? 'Đổi' : 'Change'}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={locale === 'vi' ? 'Tìm theo tên hoặc email…' : 'Search by name or email…'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  autoFocus
                />
                {searching && <p className="text-xs text-gray-500">{locale === 'vi' ? 'Đang tìm…' : 'Searching…'}</p>}
                {results.length > 0 && (
                  <ul className="max-h-64 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {results.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => setSelected(m)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        >
                          <p className="text-sm font-medium text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.email}{m.abg_class ? ` · ${m.abg_class}` : ''}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                {locale === 'vi' ? 'Họ tên khách' : 'Guest name'}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                {locale === 'vi' ? 'Số điện thoại (tuỳ chọn)' : 'Phone (optional)'}
              </label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              {locale === 'vi' ? 'Số tiền đã nhận (VND)' : 'Amount received (VND)'}
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">
              {locale === 'vi' ? 'Ghi chú (tuỳ chọn)' : 'Note (optional)'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder={locale === 'vi' ? 'VD: chuyển khoản Zalo Pay' : 'e.g. paid via Zalo Pay'}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-900">
            {locale === 'vi' ? 'Huỷ' : 'Cancel'}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="text-sm px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (locale === 'vi' ? 'Đang thêm…' : 'Adding…') : (locale === 'vi' ? 'Thêm & đánh dấu đã trả' : 'Add & mark paid')}
          </button>
        </div>
      </div>
    </div>
  );
}
