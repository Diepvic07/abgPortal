'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from './loading-spinner';

interface PaymentInfoModalProps {
  memberId: string;
  memberName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentInfoModal({ memberId, memberName, isOpen, onClose }: PaymentInfoModalProps) {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

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

      // Success - show confirmation screen
      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showConfirmation ? (
          // Confirmation Screen
          <div className="text-center py-8">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              {t.payment.confirmationTitle}
            </h2>

            {/* Message */}
            <p className="text-text-secondary mb-8">
              {t.payment.confirmationMessage}
            </p>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = '/request';
              }}
              className="w-full py-3 px-4 bg-brand text-white rounded-md font-medium hover:bg-brand-dark transition-colors"
            >
              {t.payment.findConnections}
            </button>
          </div>
        ) : (
          // Payment Details Screen
          <>
            {/* Title */}
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              {t.payment.title}
            </h2>

            {/* QR Code */}
            <div className="mb-6 flex justify-center">
              <div className="w-48 h-48 rounded-lg overflow-hidden bg-gray-50">
                <img src="https://img.glotdojo.com/insecure/fit/0/0/sm/1/plain/https://ejoy.sgp1.digitaloceanspaces.com/ghost/QR_TPbank.jpg" alt="Payment QR Code" className="w-full h-full object-contain p-2" />
              </div>
            </div>

            {/* Bank details */}
            <div className="mb-6 space-y-3 bg-bg-surface p-4 rounded-lg">
              <h3 className="font-semibold text-text-primary mb-3">{t.payment.bankDetails}</h3>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-text-secondary">{t.payment.bank}:</span>
                <span className="col-span-2 text-sm font-medium text-text-primary">TPBank</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-text-secondary">{t.payment.accountNumber}:</span>
                <span className="col-span-2 text-sm font-medium text-text-primary font-mono">158 8888 6666</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-text-secondary">{t.payment.accountName}:</span>
                <span className="col-span-2 text-sm font-medium text-text-primary">VU DINH HIEU</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-text-secondary">{t.payment.amount}:</span>
                <span className="col-span-2 text-sm font-medium text-brand">1,000,000 VND</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm text-text-secondary">{t.payment.reference}:</span>
                <span className="col-span-2 text-sm font-medium text-text-primary font-mono">
                  ABG-{memberId.substring(0, 8)}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <p className="text-sm text-text-secondary mb-6">
              {t.payment.instructions}
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-error/20 rounded-lg text-error text-sm">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isConfirming}
                className="flex-1 py-2.5 px-4 border border-border rounded-md font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t.payment.cancel}
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isConfirming}
                className="flex-1 py-2.5 px-4 bg-brand text-white rounded-md font-medium hover:bg-brand-dark disabled:bg-brand/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
          </>
        )}
      </div>
    </div>
  );
}
