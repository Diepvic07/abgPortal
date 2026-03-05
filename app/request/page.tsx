'use client';

import { ConnectionRequestForm } from '@/components/forms/connection-request-form';
import { useTranslation } from '@/lib/i18n';

export default function RequestPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero section with gradient accent */}
      <div className="relative mb-10">
        <div aria-hidden="true" className="absolute -top-4 -left-4 w-20 h-20 bg-brand/5 rounded-full blur-2xl" />
        <div aria-hidden="true" className="absolute -top-2 right-8 w-14 h-14 bg-pink-500/5 rounded-full blur-xl" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight text-brand mb-3">
            {t.request.title}
          </h1>
          <p className="text-base text-text-secondary leading-relaxed">
            {t.request.subtitle}
          </p>
        </div>
      </div>

      <ConnectionRequestForm />
    </div>
  );
}
