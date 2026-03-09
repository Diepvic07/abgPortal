'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { BugReportModal } from './bug-report-modal';

export function BugReportButton() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Báo lỗi"
        className="fixed bottom-6 right-6 z-40 h-12 px-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium whitespace-nowrap">Báo lỗi</span>
      </button>
      <BugReportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
