'use client';

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function PendingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.auth.pendingTitle}</h1>
        <p className="text-gray-600 mb-6">{t.auth.pendingDescription}</p>
        <p className="text-sm text-gray-500 mb-8">{t.auth.pendingNote}</p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t.auth.backToHome}
        </Link>
      </div>
    </div>
  );
}
