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

      // Success - close modal
      onClose();
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

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {t.payment.title}
        </h2>

        {/* QR Code placeholder */}
        <div className="mb-6 flex justify-center">
          <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
            <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-sm text-gray-500">{t.payment.qrComingSoon}</p>
          </div>
        </div>

        {/* Bank details */}
        <div className="mb-6 space-y-3 bg-bg-surface p-4 rounded-lg">
          <h3 className="font-semibold text-text-primary mb-3">{t.payment.bankDetails}</h3>

          <div className="grid grid-cols-3 gap-2">
            <span className="text-sm text-text-secondary">{t.payment.bank}:</span>
            <span className="col-span-2 text-sm font-medium text-text-primary">Vietcombank</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="text-sm text-text-secondary">{t.payment.accountNumber}:</span>
            <span className="col-span-2 text-sm font-medium text-text-primary font-mono">XXXX-XXXX-XXXX</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="text-sm text-text-secondary">{t.payment.accountName}:</span>
            <span className="col-span-2 text-sm font-medium text-text-primary">ABG ALUMNI</span>
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
      </div>
    </div>
  );
}
