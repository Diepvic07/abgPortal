'use client';

import { useTranslation } from '@/lib/i18n';

export function NewsHeroSection() {
  const { t } = useTranslation();
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {t.news.pageTitle}
        </h1>
        <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto">
          {t.news.pageSubtitle}
        </p>
      </div>
    </div>
  );
}
