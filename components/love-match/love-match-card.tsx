'use client';

import { LoveMatchRequest } from '@/types';

interface LoveMatchCardProps {
  loveMatch: LoveMatchRequest;
  isIncoming: boolean;
}

const STATUS_STYLES: Record<LoveMatchRequest['status'], { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Accepted', classes: 'bg-green-100 text-green-800' },
  refused:  { label: 'Declined', classes: 'bg-red-100 text-red-800' },
  ignored:  { label: 'Expired',  classes: 'bg-gray-100 text-gray-600' },
};

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

export function LoveMatchCard({ loveMatch, isIncoming }: LoveMatchCardProps) {
  const profile = parseProfile(
    isIncoming ? (loveMatch.from_profile_shared || '{}') : (loveMatch.to_profile_shared || '{}')
  );

  const badge = STATUS_STYLES[loveMatch.status] ?? STATUS_STYLES.pending;
  const dateLabel = new Date(loveMatch.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-base">
            {profile.nickname || (isIncoming ? 'Anonymous' : 'Your match')}
          </p>
          {profile.country && (
            <p className="text-sm text-gray-500 mt-0.5">{profile.country}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      {/* Profile fields — no real name / role / company / contact */}
      <div className="space-y-2 mb-4">
        {profile.self_description && (
          <div className="text-sm bg-pink-50 border-l-4 border-pink-300 px-3 py-2 rounded-r text-gray-700 italic">
            &ldquo;{profile.self_description}&rdquo;
          </div>
        )}
        <ProfileField label="Interests" value={profile.interests} />
        <ProfileField label="Core Values" value={profile.core_values} />
        <ProfileField label="Ideal Day" value={profile.ideal_day} />
        {profile.gender && (
          <ProfileField label="Gender" value={profile.gender} />
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 mt-2">
        {isIncoming ? 'Received' : 'Sent'} {dateLabel}
      </p>
    </div>
  );
}
