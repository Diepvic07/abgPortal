'use client';

import { LoveMatchRequest } from '@/types';
import { LoveMatchStatusBadge } from './love-match-status-badge';
import { LoveMatchRespondActions } from '@/components/love-match/love-match-respond-actions';

interface IncomingLoveMatchCardProps {
  loveMatch: LoveMatchRequest;
  onRespond: (id: string, action: 'accept' | 'refuse') => void;
  isLoading: boolean;
}

function parseProfile(json: string): Record<string, string> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="font-medium text-gray-500">{label}: </span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

function getExpiresAt(viewedAt: string): string {
  const d = new Date(viewedAt);
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

export function IncomingLoveMatchCard({
  loveMatch,
  onRespond,
  isLoading,
}: IncomingLoveMatchCardProps) {
  const profile = parseProfile(loveMatch.from_profile_shared || '{}');
  const isDimmed = loveMatch.status === 'refused' || loveMatch.status === 'ignored';
  const expiresAt = loveMatch.viewed_at ? getExpiresAt(loveMatch.viewed_at) : undefined;

  return (
    <div
      className={`border border-pink-100 rounded-xl p-5 shadow-sm transition-shadow ${
        isDimmed ? 'opacity-50 bg-gray-50' : 'bg-white hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-base">
            {profile.nickname || 'Anonymous'}
          </p>
          {profile.country && (
            <p className="text-sm text-gray-500 mt-0.5">{profile.country}</p>
          )}
        </div>
        <LoveMatchStatusBadge status={loveMatch.status} isOutgoing={false} />
      </div>

      {/* Anonymous profile fields — no real name / role / company / contact */}
      <div className="space-y-2 mb-4">
        {profile.self_description && (
          <div className="text-sm bg-pink-50 border-l-4 border-pink-300 px-3 py-2 rounded-r text-gray-700 italic">
            &ldquo;{profile.self_description}&rdquo;
          </div>
        )}
        <ProfileField label="Interests" value={profile.interests} />
        <ProfileField label="Core Values" value={profile.core_values} />
        <ProfileField label="Ideal Day" value={profile.ideal_day} />
        {profile.gender && <ProfileField label="Gender" value={profile.gender} />}
      </div>

      {/* Actions or result messages */}
      {loveMatch.status === 'pending' && (
        <LoveMatchRespondActions
          loveMatchId={loveMatch.id}
          onRespond={(action) => onRespond(loveMatch.id, action)}
          isLoading={isLoading}
          expiresAt={expiresAt}
        />
      )}

      {loveMatch.status === 'accepted' && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            Identity revealed — check your email for their contact details.
          </p>
        </div>
      )}

      {/* Footer date */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 mt-3">
        Received {new Date(loveMatch.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </p>
    </div>
  );
}
