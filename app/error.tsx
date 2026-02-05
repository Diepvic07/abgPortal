'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          {t.errorPage.title}
        </h2>
        <p className="text-text-secondary mb-6">
          {t.errorPage.message}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3.5 bg-brand text-white rounded-md font-medium hover:bg-brand-dark transition-colors"
        >
          {t.errorPage.retry}
        </button>
      </div>
    </div>
  );
}
