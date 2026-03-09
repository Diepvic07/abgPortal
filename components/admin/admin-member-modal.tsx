'use client';

import { Member } from '@/types';
import { MemberProfileCard } from '@/components/ui/member-profile-card';
import { useEffect } from 'react';

interface AdminMemberModalProps {
  member: Member | null;
  onClose: () => void;
}

export function AdminMemberModal({ member, onClose }: AdminMemberModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 pb-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-3xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-slide-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors z-50"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex-1 overflow-y-auto w-full scrollbar-hide sm:scrollbar-default">
          <MemberProfileCard member={member} />
        </div>
      </div>
    </div>
  );
}
