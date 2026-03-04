'use client';

import { Member, getAvatarMemberStatus } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { getCountryFlag } from '@/lib/country-flags';

interface AdminMemberModalProps {
  member: Member | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-200 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-block rounded bg-gray-700 px-3 py-1 text-xs text-blue-400 hover:bg-gray-600 transition-colors">
      {label}
    </a>
  );
}

export function AdminMemberModal({ member, onClose }: AdminMemberModalProps) {
  if (!member) return null;

  const flag = getCountryFlag(member.country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-6"
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white text-xl">&times;</button>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="xl" memberStatus={getAvatarMemberStatus(member)} className="!w-24 !h-24 !text-2xl" />
            {member.abg_class && (
              <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{member.abg_class}</span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-bold text-white">{member.name}</h2>
            {member.country && <p className="text-sm text-gray-400">{flag} {member.country}</p>}

            <dl className="space-y-3">
              <DetailRow label="Industry" value={member.expertise} />
              <DetailRow label="Role" value={member.role} />
              <DetailRow label="Company" value={member.company} />
              <DetailRow label="Can Help With" value={member.can_help_with} />
              <DetailRow label="Looking For" value={member.looking_for} />
              <DetailRow label="Bio" value={member.bio} />
              <DetailRow label="Email" value={member.email} />
              <DetailRow label="Phone" value={member.phone} />
            </dl>

            {/* Social Links */}
            <div className="flex flex-wrap gap-2 pt-2">
              {member.linkedin_url && <LinkButton href={member.linkedin_url} label="LinkedIn" />}
              {member.facebook_url && <LinkButton href={member.facebook_url} label="Facebook" />}
              {member.company_website && <LinkButton href={member.company_website} label="Website" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
