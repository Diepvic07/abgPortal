'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from './loading-spinner';

interface PaymentInfoModalProps {
  memberId: string;
  memberName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentInfoModal({ memberId, memberName: memberNameProp, isOpen, onClose }: PaymentInfoModalProps) {
  const { data: session } = useSession();
  // Always show the logged-in user's name, not the passed prop (which may be a search result)
  const memberName = session?.user?.name || memberNameProp;
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const referenceCode = `Alumni - ${memberName} - [Khoa] - [Phone]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: 'pending',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {showConfirmation ? (
          // ── Confirmation Screen ──────────────────────────────
          <div className="flex flex-col items-center text-center px-6 pt-10 pb-8 gap-5">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-md">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-brand mb-2">
                {t.payment.confirmationTitle}
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                {t.payment.confirmationMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = '/request';
              }}
              className="w-full py-4 px-4 bg-brand text-white rounded-xl font-semibold text-base hover:bg-brand-dark active:scale-95 transition-all duration-150 shadow-md"
            >
              {t.payment.findConnections}
            </button>
          </div>

        ) : (
          // ── Payment Details Screen ───────────────────────────
          <>
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-brand to-brand-light px-6 pt-8 pb-6 text-white">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold">{t.payment.title}</h2>
              </div>
              <p className="text-white/70 text-sm">
                {t.payment.description.split('{name}')[0]}
                <span className="font-medium text-white">{memberName}</span>
                {t.payment.description.split('{name}')[1]}
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-2 rounded-2xl border-2 border-brand/15 bg-brand/5 shadow-inner">
                  <img
                    src="https://img.glotdojo.com/insecure/fit/0/0/sm/1/plain/https://ejoy.sgp1.digitaloceanspaces.com/ghost/QR_TPbank.jpg"
                    alt="Payment QR Code"
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                </div>
              </div>

              {/* Bank details card */}
              <div className="rounded-xl border border-border bg-bg-primary overflow-hidden">
                <div className="px-4 py-2.5 bg-brand/5 border-b border-border">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-brand/60">{t.payment.bankDetails}</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: t.payment.bank, value: 'TPBank', mono: false },
                    { label: t.payment.accountNumber, value: '158 8888 6666', mono: true },
                    { label: t.payment.accountName, value: 'VU DINH HIEU', mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-text-secondary">{label}</span>
                      <span className={`text-sm font-semibold text-brand ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}

                  {/* Amount – Early Bird pricing */}
                  <div className="px-4 py-3 bg-emerald-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-secondary">{t.payment.amount}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 line-through">999.000 VND</span>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                          599.000 VND
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Ưu đãi Early Bird đến hết 03/04/2026. Sau thời gian này, mức phí sẽ là 999.000 VND. Hạn sử dụng đến ngày 31/12/2026
                    </p>
                  </div>

                  {/* Reference – copyable */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-text-secondary">{t.payment.reference}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-sm font-mono font-semibold text-brand hover:text-brand-light transition-colors group"
                    >
                      {referenceCode}
                      <span className="text-brand/40 group-hover:text-brand transition-colors">
                        {copied ? (
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-800 leading-relaxed">{t.payment.instructions}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-error/20 rounded-xl text-error text-sm">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isConfirming}
                  className="flex-1 py-3 px-4 border border-border rounded-xl font-medium text-sm text-text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t.payment.cancel}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isConfirming}
                  className="flex-1 py-3 px-4 bg-brand text-white rounded-xl font-semibold text-sm hover:bg-brand-dark active:scale-95 disabled:bg-brand/50 disabled:cursor-not-allowed transition-all duration-150 shadow-md flex items-center justify-center gap-2"
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
          </>
        )}
      </div>
    </div>
  );
}
