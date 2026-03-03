'use client';

import { Member } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { getCountryFlag } from '@/lib/country-flags';

interface AdminMemberCardProps {
  member: Member;
  onSelect: (member: Member) => void;
}

export function AdminMemberCard({ member, onSelect }: AdminMemberCardProps) {
  const flag = getCountryFlag(member.country);

  return (
    <button
      onClick={() => onSelect(member)}
      className="w-full text-left rounded-lg border border-gray-700 bg-gray-800 p-4 hover:border-blue-500 hover:bg-gray-750 transition-colors"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate">{member.name}</h3>
          {member.expertise && (
            <p className="text-sm text-blue-400 truncate">{member.expertise}</p>
          )}
          {member.company && (
            <p className="text-sm text-gray-400 truncate">
              {member.role ? `${member.role} at ` : ''}{member.company}
            </p>
          )}
          {member.country && (
            <p className="text-xs text-gray-500 mt-1">
              {flag} {member.country}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
