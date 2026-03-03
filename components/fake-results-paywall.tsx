'use client';

import { useState } from 'react';
import { SignInButton } from '@/components/ui/sign-in-button';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Payment configuration
const PAYMENT_CONFIG = {
  price: '1,000,000 VND',
  priceDescription: {
    vi: 'Phí thành viên / năm',
    en: 'Annual membership fee',
  },
  bank: 'Vietcombank',
  accountNumber: '0071000911911',
  accountName: 'NGUYEN VAN A',
  qrCodeUrl: '/images/payment-qr.png',
  contact: {
    vi: 'Liên hệ Admin qua Discord hoặc email: admin@abgalumni.com',
    en: 'Contact Admin via Discord or email: admin@abgalumni.com',
  },
};

interface FakeResultsPaywallProps {
  type: 'sign-in' | 'upgrade';
  matchType: string;
  onBack: () => void;
}

export function FakeResultsPaywall({ type, matchType, onBack }: FakeResultsPaywallProps) {
  const { t, locale } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDating = matchType === 'love' || matchType === 'dating';
  const buttonColor = isDating ? 'bg-pink-500 hover:bg-pink-600' : 'bg-brand hover:bg-brand-dark';

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pending' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      setConfirmationSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Sign-in prompt for unauthenticated users
  if (type === 'sign-in') {
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {t.auth.signInRequired}
        </h3>
        <p className="text-gray-600 mb-8">
          {t.auth.signInDescription}
        </p>
        <SignInButton className="mx-auto" />
        <button
          onClick={onBack}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline block mx-auto"
        >
          {t.common.cancel}
        </button>
      </div>
    );
  }

  // Confirmation sent state
  if (confirmationSent) {
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {locale === 'vi' ? 'Đã gửi xác nhận!' : 'Confirmation Sent!'}
        </h3>
        <p className="text-gray-600 mb-6">
          {locale === 'vi'
            ? 'Admin sẽ xác minh thanh toán và kích hoạt tài khoản Premium trong vòng 24 giờ.'
            : 'Admin will verify your payment and activate your Premium account within 24 hours.'}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {PAYMENT_CONFIG.contact[locale as 'vi' | 'en'] || PAYMENT_CONFIG.contact.en}
        </p>
        <button
          onClick={onBack}
          className={`px-8 py-3 text-white rounded-lg font-medium transition-colors ${buttonColor}`}
        >
          {locale === 'vi' ? 'Quay lại' : 'Go Back'}
        </button>
      </div>
    );
  }

  // Upgrade/payment prompt for basic users
  return (
    <div className="max-w-lg mx-auto py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {locale === 'vi' ? 'Nâng cấp Premium' : 'Upgrade to Premium'}
        </h3>
        <p className="text-gray-600">
          {locale === 'vi'
            ? 'Thanh toán để mở khóa tính năng tìm kiếm kết nối'
            : 'Pay to unlock connection search feature'}
        </p>
      </div>

      {/* Price card */}
      <div className="bg-gradient-to-br from-brand/5 to-brand/10 border-2 border-brand/20 rounded-xl p-6 mb-6 text-center">
        <p className="text-4xl font-bold text-brand mb-1">{PAYMENT_CONFIG.price}</p>
        <p className="text-gray-600">
          {PAYMENT_CONFIG.priceDescription[locale as 'vi' | 'en'] || PAYMENT_CONFIG.priceDescription.en}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-6">
        <div className="w-48 h-48 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-white overflow-hidden shadow-sm">
          {PAYMENT_CONFIG.qrCodeUrl && !PAYMENT_CONFIG.qrCodeUrl.includes('placeholder') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={PAYMENT_CONFIG.qrCodeUrl}
              alt="Payment QR Code"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="text-center p-4">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-sm text-gray-400">{t.payment.qrComingSoon}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bank details */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {t.payment.bankDetails}
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t.payment.bank}</span>
            <span className="font-semibold text-gray-900">{PAYMENT_CONFIG.bank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.payment.accountNumber}</span>
            <span className="font-mono font-semibold text-gray-900">{PAYMENT_CONFIG.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.payment.accountName}</span>
            <span className="font-semibold text-gray-900">{PAYMENT_CONFIG.accountName}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-gray-500">{t.payment.reference}</span>
            <span className="font-mono font-semibold text-brand">ABG-[Email]</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500 text-center mb-4">
        {t.payment.instructions}
      </p>

      {/* Contact */}
      <p className="text-sm text-gray-500 text-center mb-6">
        {PAYMENT_CONFIG.contact[locale as 'vi' | 'en'] || PAYMENT_CONFIG.contact.en}
      </p>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={handleConfirmPayment}
          disabled={isConfirming}
          className={`flex-1 py-3 px-4 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${buttonColor}`}
        >
          {isConfirming ? (
            <>
              <LoadingSpinner size="sm" />
              <span>{t.payment.confirming}</span>
            </>
          ) : (
            t.payment.confirmPayment
          )}
        </button>
      </div>
    </div>
  );
}
