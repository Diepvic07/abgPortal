'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { LoveMatchRequest } from '@/types';
import { IncomingLoveMatchCard } from './incoming-love-match-card';
import { getInternalProfileUrl } from '@/lib/profile-url';

interface EnrichedConnection {
  id: string;
  created_at: string;
  request_text: string;
  requester: {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar_url?: string;
    public_profile_slug?: string;
  } | null;
}

interface IncomingMatchesListProps {
  connections: EnrichedConnection[];
  loveMatches?: LoveMatchRequest[];
  onLoveMatchRespond?: (id: string, action: 'accept' | 'refuse') => void;
  loveMatchLoadingId?: string | null;
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

export function IncomingMatchesList({
  connections,
  loveMatches = [],
  onLoveMatchRespond,
  loveMatchLoadingId,
}: IncomingMatchesListProps) {
  const { t } = useTranslation();
  const hasConnections = connections.length > 0;
  const hasLoveMatches = loveMatches.length > 0;

  if (!hasConnections && !hasLoveMatches) {
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-gray-600">{t.history.noIncoming}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Regular incoming connections */}
      {hasConnections && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Connections
          </h3>
          <div className="space-y-4">
            {connections.map((connection) => {
              const CardWrapper = connection.requester?.id
                ? ({ children }: { children: React.ReactNode }) => (
                  <Link href={getInternalProfileUrl(connection.requester!)} className="block border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-brand/40 transition-all bg-white group">
                    {children}
                  </Link>
                )
                : ({ children }: { children: React.ReactNode }) => (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    {children}
                  </div>
                );

              return (
                <CardWrapper key={connection.id}>
                  {/* Date */}
                  <div className="flex justify-end mb-3">
                    <span className="text-sm text-gray-500">
                      {getRelativeTime(connection.created_at)}
                    </span>
                  </div>

                  {/* Requester Info */}
                  {connection.requester && (
                    <div className="flex items-center gap-3 mb-4">
                      <MemberAvatar
                        name={connection.requester.name}
                        avatarUrl={connection.requester.avatar_url}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 group-hover:text-brand transition-colors truncate">
                          {connection.requester.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {connection.requester.role} at {connection.requester.company}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Request Text */}
                  {connection.request_text && (
                    <div className="bg-gray-50 rounded-md p-3 border border-gray-100 mt-2">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                        {t.history.theyWereLookingFor}
                      </p>
                      <p className="text-sm text-gray-700">{connection.request_text}</p>
                    </div>
                  )}

                  {/* View Profile prompt */}
                  {connection.requester?.id && (
                    <div className="mt-4 flex items-center text-sm font-medium text-brand">
                      <span>View full profile</span>
                      <svg className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </CardWrapper>
              )
            })}
          </div>
        </div>
      )}

      {/* Incoming love match requests */}
      {hasLoveMatches && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span>Love Match Requests</span>
            <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full border border-pink-200">
              {loveMatches.filter(lm => lm.status === 'pending').length} pending
            </span>
          </h3>
          <div className="space-y-4">
            {loveMatches.map((lm) => (
              <IncomingLoveMatchCard
                key={lm.id}
                loveMatch={lm}
                onRespond={onLoveMatchRespond ?? (() => { })}
                isLoading={loveMatchLoadingId === lm.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
