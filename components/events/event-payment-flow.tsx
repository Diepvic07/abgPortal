'use client';

import { useState } from 'react';
import { CommunityEvent, PayerType } from '@/types';
import { useTranslation } from '@/lib/i18n';

const DEFAULT_PAYMENT_CONFIG = {
  bank: 'TPBank',
  accountNumber: '158 8888 6666',
  accountName: 'VU DINH HIEU',
  qrCodeUrl: 'https://img.glotdojo.com/insecure/fit/0/0/sm/1/plain/https://ejoy.sgp1.digitaloceanspaces.com/ghost/QR_TPbank.jpg',
};

/**
 * Generate a memorable event code from event title + date.
 * Format: 2-char title initials + DDMM date
 * Examples: "Pool Party 2026-04-12" → "PP1204", "Wine Tasting 2026-07-05" → "WT0507"
 */
function generateEventCode(title: string, eventDate: string): string {
  // Strip diacritics and brackets, then extract up to 2 uppercase initials
  const clean = title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\[\](){}]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  let initials = '';
  for (const w of words) {
    if (initials.length >= 2) break;
    const ch = w[0]?.toUpperCase();
    if (ch && /[A-Z0-9]/.test(ch)) initials += ch;
  }
  while (initials.length < 2) initials += 'X';

  // DDMM format
  const d = new Date(eventDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  return initials.slice(0, 2) + dd + mm;
}

interface EventPaymentFlowProps {
  event: CommunityEvent;
  payerType: PayerType;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  paymentId: string;
  onComplete: () => void;
}

export function EventPaymentFlow({ event, payerType, payerName, payerEmail, payerPhone, paymentId, onComplete }: EventPaymentFlowProps) {
  const { locale } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const t = locale === 'vi' ? {
    premiumFee: 'Phí ABG Premium',
    basicFee: 'Phí ABG Basic',
    guestFee: 'Phí khách',
    bank: 'Ngân hàng',
    account: 'Số tài khoản',
    name: 'Tên',
    transferContent: 'Nội dung CK',
    confirmButton: 'Tôi đã chuyển khoản',
    confirming: 'Đang gửi...',
    confirmNote: 'Sau khi bấm, admin sẽ kiểm tra chuyển khoản và xác nhận đăng ký của bạn.',
    successTitle: 'Đã gửi xác nhận thanh toán!',
    successMessage: 'Admin sẽ kiểm tra thanh toán của bạn sớm. Bạn sẽ nhận được xác nhận.',
    done: 'Xong',
    noQr: 'Chưa có mã QR',
  } : {
    premiumFee: 'ABG Premium fee',
    basicFee: 'ABG Basic fee',
    guestFee: 'Guest fee',
    bank: 'Bank',
    account: 'Account',
    name: 'Name',
    transferContent: 'Transfer content',
    confirmButton: 'I Have Made Payment',
    confirming: 'Sending...',
    confirmNote: 'After clicking, admin will verify your transfer and confirm your registration.',
    successTitle: 'Payment Confirmation Sent!',
    successMessage: 'Admin will verify your payment shortly. You will receive a confirmation.',
    done: 'Done',
    noQr: 'No QR available',
  };

  const fee = payerType === 'premium' ? event.fee_premium : payerType === 'basic' ? event.fee_basic : event.fee_guest;
  const formattedFee = fee != null ? new Intl.NumberFormat('vi-VN').format(fee) : '0';
  const qrUrl = event.payment_qr_url || DEFAULT_PAYMENT_CONFIG.qrCodeUrl;

  const feeLabel = payerType === 'premium' ? t.premiumFee : payerType === 'basic' ? t.basicFee : t.guestFee;

  // Generate memorable event code: 2 title initials + day + month letter
  const eventCode = generateEventCode(event.title, event.event_date);

  // Build transfer content: Name Phone EventCode
  const namePart = payerName.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const phonePart = payerPhone ? payerPhone.replace(/\s+/g, '') : '';
  const transferContent = [namePart, phonePart, eventCode].filter(Boolean).join(' ');

  async function handleConfirmPayment() {
    setConfirming(true);
    setError('');

    try {
      const isGuest = payerType === 'guest';
      const url = isGuest
        ? `/api/public/events/${event.id}/confirm-payment`
        : `/api/community/events/${event.id}/confirm-payment`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payer_name: payerName, payer_email: payerEmail, payment_id: paymentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to confirm payment');
        return;
      }

      setConfirmed(true);
    } catch {
      setError('Something went wrong');
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t.successTitle}</h3>
        <p className="text-sm text-gray-600 mb-6">{t.successMessage}</p>
        <button
          onClick={onComplete}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          {t.done}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Fee Amount */}
      <div className="text-center">
        <p className="text-3xl font-bold text-blue-600 mb-1">{formattedFee} VND</p>
        <p className="text-sm text-gray-500">{feeLabel}</p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="w-56 h-56 border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
          {qrUrl ? (
            <img src={qrUrl} alt="Payment QR Code" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{t.noQr}</div>
          )}
        </div>
      </div>

      {/* Bank Details & Transfer Content */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        {event.payment_instructions ? (
          <p className="text-gray-700 whitespace-pre-wrap">{event.payment_instructions}</p>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.bank}:</span>
              <span className="font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.bank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.account}:</span>
              <span className="font-mono font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.name}:</span>
              <span className="font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.accountName}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-start gap-3">
          <span className="text-gray-500 shrink-0">{t.transferContent}:</span>
          <span className="font-mono font-semibold text-gray-900 text-xs text-right break-all">{transferContent}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirmPayment}
        disabled={confirming}
        className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
      >
        {confirming ? t.confirming : t.confirmButton}
      </button>

      <p className="text-xs text-gray-400 text-center">
        {t.confirmNote}
      </p>
    </div>
  );
}
