'use client';

import { useTranslation } from '@/lib/i18n';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { RequestCategory } from '@/types';

interface EnrichedRequest {
  id: string;
  request_text: string;
  status: 'pending' | 'matched' | 'connected' | 'declined';
  created_at: string;
  category?: RequestCategory;
  matched_member: {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar_url?: string;
  } | null;
}

const CATEGORY_STYLES: Record<RequestCategory, { label: string; classes: string }> = {
  love:    { label: 'Love',    classes: 'bg-pink-100 text-pink-700 border-pink-200' },
  job:     { label: 'Job',     classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  hiring:  { label: 'Hiring',  classes: 'bg-purple-100 text-purple-700 border-purple-200' },
  partner: { label: 'Partner', classes: 'bg-orange-100 text-orange-700 border-orange-200' },
};

interface RequestHistoryListProps {
  requests: EnrichedRequest[];
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'matched':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'connected':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'declined':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function RequestHistoryList({ requests }: RequestHistoryListProps) {
  const { t } = useTranslation();

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-600">{t.history.noRequests}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Status Badge, Category Badge and Date */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  request.status
                )}`}
              >
                {request.status === 'pending' ? t.history.status.pending :
                 request.status === 'matched' ? t.history.status.matched :
                 request.status === 'connected' ? t.history.status.connected :
                 t.history.status.declined}
              </span>
              {request.category && CATEGORY_STYLES[request.category] && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_STYLES[request.category].classes}`}
                >
                  {CATEGORY_STYLES[request.category].label}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {getRelativeTime(request.created_at)}
            </span>
          </div>

          {/* Request Text */}
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {request.request_text}
          </p>

          {/* Matched Member Info */}
          {request.matched_member && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <MemberAvatar
                name={request.matched_member.name}
                avatarUrl={request.matched_member.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {request.matched_member.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {request.matched_member.role} at {request.matched_member.company}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
