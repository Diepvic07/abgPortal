'use client';

import { useState } from 'react';

interface LoveMatchRespondActionsProps {
  loveMatchId: string;
  onRespond: (action: 'accept' | 'refuse') => void;
  isLoading: boolean;
  expiresAt?: string;
}

function getDaysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function LoveMatchRespondActions({
  loveMatchId,
  onRespond,
  isLoading,
  expiresAt,
}: LoveMatchRespondActionsProps) {
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);

  const daysRemaining = expiresAt ? getDaysRemaining(expiresAt) : null;

  return (
    <div className="mt-4">
      {daysRemaining !== null && (
        <p className={`text-xs mb-3 font-medium ${daysRemaining <= 1 ? 'text-red-500' : 'text-gray-400'}`}>
          {daysRemaining === 0
            ? 'Expires today'
            : `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
        </p>
      )}

      {!showRefuseConfirm ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond('accept')}
            disabled={isLoading}
            className="flex-1 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={() => setShowRefuseConfirm(true)}
            disabled={isLoading}
            className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Pass
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <p className="text-sm text-gray-700 mb-3">
            Are you sure you want to pass on this match? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowRefuseConfirm(false);
                onRespond('refuse');
              }}
              disabled={isLoading}
              className="flex-1 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Yes, Pass
            </button>
            <button
              onClick={() => setShowRefuseConfirm(false)}
              disabled={isLoading}
              className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
