'use client';

interface LoveMatchStatusBadgeProps {
  status: 'pending' | 'accepted' | 'refused' | 'ignored';
  isOutgoing: boolean;
}

const BADGE_CONFIG: Record<string, { label: string; classes: string }> = {
  pending_outgoing: {
    label: 'Waiting for response',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  pending_incoming: {
    label: 'Awaiting your response',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  accepted: {
    label: 'Matched!',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  refused: {
    label: 'Not a match',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  ignored: {
    label: 'Expired',
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function LoveMatchStatusBadge({ status, isOutgoing }: LoveMatchStatusBadgeProps) {
  const key =
    status === 'pending'
      ? isOutgoing
        ? 'pending_outgoing'
        : 'pending_incoming'
      : status;

  const config = BADGE_CONFIG[key] ?? BADGE_CONFIG.ignored;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
