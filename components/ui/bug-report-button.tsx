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
        title="Báo lỗi / Report Bug"
        className="fixed bottom-6 right-6 z-40 group flex flex-col items-center gap-1"
      >
        {/* Ladybug SVG */}
        <svg width="52" height="52" viewBox="0 0 52 52" className="drop-shadow-lg hover:drop-shadow-xl transition-all group-hover:scale-110 duration-200">
          {/* Body */}
          <ellipse cx="26" cy="30" rx="16" ry="14" fill="#DC2626" />
          {/* Center line */}
          <line x1="26" y1="16" x2="26" y2="44" stroke="#1a1a1a" strokeWidth="1.5" />
          {/* Spots */}
          <circle cx="20" cy="24" r="3" fill="#1a1a1a" />
          <circle cx="32" cy="24" r="3" fill="#1a1a1a" />
          <circle cx="19" cy="33" r="2.5" fill="#1a1a1a" />
          <circle cx="33" cy="33" r="2.5" fill="#1a1a1a" />
          <circle cx="26" cy="38" r="2" fill="#1a1a1a" />
          {/* Head */}
          <circle cx="26" cy="17" r="7" fill="#1a1a1a" />
          {/* Eyes */}
          <circle cx="23" cy="15" r="2" fill="white" />
          <circle cx="29" cy="15" r="2" fill="white" />
          <circle cx="23.5" cy="15.5" r="1" fill="#1a1a1a" />
          <circle cx="29.5" cy="15.5" r="1" fill="#1a1a1a" />
          {/* Antennae */}
          <line x1="23" y1="11" x2="18" y2="5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="29" y1="11" x2="34" y2="5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18" cy="5" r="1.5" fill="#1a1a1a" />
          <circle cx="34" cy="5" r="1.5" fill="#1a1a1a" />
        </svg>
        <span className="bg-red-600 text-white text-[11px] font-bold leading-tight text-center px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
          Báo lỗi
        </span>
      </button>
      <BugReportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
