'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import posthog from 'posthog-js';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Link from 'next/link';

const PAYMENT_CONFIG = {
  price: '999.000 VND',
  priceDescription: { vi: 'Phí thành viên / năm', en: 'Annual membership fee' },
  validityNote: 'Hạn sử dụng đến ngày 31/12/2026',
  bank: 'TPBank',
  accountNumber: '158 8888 6666',
  accountName: 'VU DINH HIEU',
  qrCodeUrl: 'https://img.glotdojo.com/insecure/fit/0/0/sm/1/plain/https://ejoy.sgp1.digitaloceanspaces.com/ghost/QR_TPbank.jpg',
  contact: { vi: 'Liên hệ Admin qua Discord hoặc email: bdh.alumni@abg.edu.vn', en: 'Contact Admin via Discord or email: bdh.alumni@abg.edu.vn' },
};

const PREMIUM_BENEFITS = {
  vi: [
    { icon: '🔍', title: 'Tìm kiếm không giới hạn', desc: 'Tìm kiếm kết nối không giới hạn với hơn 600 thành viên ABG' },
    { icon: '🤝', title: 'Kết nối chất lượng cao', desc: 'AI matching thông minh giúp tìm đúng người phù hợp với nhu cầu' },
    { icon: '💼', title: 'Cơ hội việc làm độc quyền', desc: 'Tiếp cận các vị trí tuyển dụng chỉ dành cho thành viên Premium' },
    { icon: '❤️', title: 'Hẹn hò trong cộng đồng', desc: 'Tìm kiếm bạn đời trong mạng lưới ABG Alumni đã xác minh' },
    { icon: '⭐', title: 'Hỗ trợ ưu tiên', desc: 'Được hỗ trợ nhanh chóng từ đội ngũ Admin' },
    { icon: '🎯', title: 'Hiển thị nổi bật', desc: 'Hồ sơ của bạn được ưu tiên hiển thị trong kết quả tìm kiếm' },
  ],
  en: [
    { icon: '🔍', title: 'Unlimited Searches', desc: 'Unlimited connection searches with 600+ ABG members' },
    { icon: '🤝', title: 'High-Quality Matches', desc: 'Smart AI matching finds the right people for your needs' },
    { icon: '💼', title: 'Exclusive Job Opportunities', desc: 'Access job positions exclusive to Premium members' },
    { icon: '❤️', title: 'Community Dating', desc: 'Find your partner within the verified ABG Alumni network' },
    { icon: '⭐', title: 'Priority Support', desc: 'Get fast support from the Admin team' },
    { icon: '🎯', title: 'Featured Profile', desc: 'Your profile is prioritized in search results' },
  ],
};

export function UpgradePremiumPrompt() {
  const { t, locale } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  // Track upgrade page view
  useEffect(() => {
    posthog.capture('upgrade_prompt_viewed');
  }, []);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const benefits = PREMIUM_BENEFITS[locale as 'vi' | 'en'] || PREMIUM_BENEFITS.en;

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pending' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || t.common.error);
      }

      setConfirmationSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
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
        <Link href="/request" className="inline-block px-6 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors">
          {locale === 'vi' ? 'Tìm kết nối ngay' : 'Find Connections Now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand to-brand-dark p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-2">
          {locale === 'vi' ? 'Chào mừng trở lại!' : 'Welcome Back!'}
        </h2>
        <p className="text-white/80">
          {locale === 'vi'
            ? 'Nâng cấp Premium để mở khóa toàn bộ tính năng'
            : 'Upgrade to Premium to unlock all features'}
        </p>
      </div>

      <div className="p-8">
        {/* Benefits */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {locale === 'vi' ? 'Quyền lợi Premium' : 'Premium Benefits'}
          </h3>
          <div className="grid gap-4">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">{benefit.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="bg-gradient-to-br from-brand/5 to-brand/10 border-2 border-brand/20 rounded-xl p-6 mb-6 text-center">
          <div className="mb-1">
            <span className="text-4xl font-bold text-brand">{PAYMENT_CONFIG.price}</span>
          </div>
          <p className="text-gray-600">
            {PAYMENT_CONFIG.priceDescription[locale as 'vi' | 'en'] || PAYMENT_CONFIG.priceDescription.en}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {PAYMENT_CONFIG.validityNote}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="w-48 h-48 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-white overflow-hidden shadow-sm">
            {PAYMENT_CONFIG.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={PAYMENT_CONFIG.qrCodeUrl} alt="Payment QR Code" className="w-full h-full object-contain p-2" />
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
          <h4 className="font-semibold text-gray-900 mb-4">{t.payment.bankDetails}</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.payment.bank}</span>
              <span className="font-semibold">{PAYMENT_CONFIG.bank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.payment.accountNumber}</span>
              <span className="font-mono font-semibold">{PAYMENT_CONFIG.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.payment.accountName}</span>
              <span className="font-semibold">{PAYMENT_CONFIG.accountName}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-500">{t.payment.reference}</span>
              <span className="font-mono font-semibold text-brand">Alumni - [Tên] - [Khoá] - [Số đt]</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-500 text-center mb-4">{t.payment.instructions}</p>
        <p className="text-sm text-gray-500 text-center mb-6">
          {PAYMENT_CONFIG.contact[locale as 'vi' | 'en'] || PAYMENT_CONFIG.contact.en}
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/request" className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center">
            {locale === 'vi' ? 'Để sau' : 'Maybe Later'}
          </Link>
          <button
            onClick={handleConfirmPayment}
            disabled={isConfirming}
            className="flex-1 py-3 px-4 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isConfirming ? <><LoadingSpinner size="sm" /><span>{t.payment.confirming}</span></> : t.payment.confirmPayment}
          </button>
        </div>
      </div>
    </div>
  );
}
