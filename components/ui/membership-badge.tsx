'use client';

import { useTranslation } from '@/lib/i18n';
import type { MembershipStatus } from '@/types';

interface MembershipBadgeProps {
  status: MembershipStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<MembershipStatus, { color: string; bgColor: string }> = {
  premium: { color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  basic: { color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pending: { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'grace-period': { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  expired: { color: 'text-red-700', bgColor: 'bg-red-100' },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
};

export function MembershipBadge({ status, size = 'md', className = '' }: MembershipBadgeProps) {
  const { t } = useTranslation();
  const { color, bgColor } = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${color} ${bgColor} ${sizeClass} ${className}`}
    >
      {t.profile.membership[status as keyof typeof t.profile.membership]}
    </span>
  );
}
