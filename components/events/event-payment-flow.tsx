'use client';

import { useState } from 'react';
import { CommunityEvent, PayerType } from '@/types';

const DEFAULT_PAYMENT_CONFIG = {
  bank: 'TPBank',
  accountNumber: '158 8888 6666',
  accountName: 'VU DINH HIEU',
  qrCodeUrl: 'https://img.glotdojo.com/insecure/fit/0/0/sm/1/plain/https://ejoy.sgp1.digitaloceanspaces.com/ghost/QR_TPbank.jpg',
};

interface EventPaymentFlowProps {
  event: CommunityEvent;
  payerType: PayerType;
  payerName: string;
  payerEmail: string;
  paymentId: string;
  onComplete: () => void;
}

export function EventPaymentFlow({ event, payerType, payerName, payerEmail, paymentId, onComplete }: EventPaymentFlowProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const fee = payerType === 'premium' ? event.fee_premium : payerType === 'basic' ? event.fee_basic : event.fee_guest;
  const formattedFee = fee != null ? new Intl.NumberFormat('vi-VN').format(fee) : '0';
  const qrUrl = event.payment_qr_url || DEFAULT_PAYMENT_CONFIG.qrCodeUrl;

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
        <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Confirmation Sent!</h3>
        <p className="text-sm text-gray-600 mb-6">Admin will verify your payment shortly. You will receive a confirmation.</p>
        <button
          onClick={onComplete}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Fee Amount */}
      <div className="text-center">
        <p className="text-3xl font-bold text-blue-600 mb-1">{formattedFee} VND</p>
        <p className="text-sm text-gray-500">
          {payerType === 'premium' ? 'ABG Premium' : payerType === 'basic' ? 'ABG Basic' : 'Guest'} fee
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="w-56 h-56 border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
          {qrUrl ? (
            <img src={qrUrl} alt="Payment QR Code" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No QR available</div>
          )}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        {event.payment_instructions ? (
          <p className="text-gray-700 whitespace-pre-wrap">{event.payment_instructions}</p>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Bank:</span>
              <span className="font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.bank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account:</span>
              <span className="font-mono font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-semibold text-gray-900">{DEFAULT_PAYMENT_CONFIG.accountName}</span>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Content:</span>
          <span className="font-mono font-semibold text-gray-900 text-xs">EVENT {event.id.slice(0, 8).toUpperCase()}</span>
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
        {confirming ? 'Sending...' : 'I Have Made Payment'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        After clicking, admin will verify your transfer and confirm your registration.
      </p>
    </div>
  );
}
