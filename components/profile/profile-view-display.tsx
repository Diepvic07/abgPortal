'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MembershipBadge } from '@/components/ui/membership-badge';
import type { Member, MembershipStatus } from '@/types';
import { getAvatarMemberStatus } from '@/types';

/* ---------- inline SVG icon components ---------- */
const IconMail = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const IconBriefcase = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconStar = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);
const IconHeart = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const IconLink = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);
const IconUser = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);
const IconPen = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
  </svg>
);

/* ---------- reusable sub-components ---------- */
const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6">
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-brand-light">{icon}</span>
      <h2 className="text-base font-semibold text-brand">{title}</h2>
    </div>
    {children}
  </section>
);

const InfoField = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-lg bg-gray-50/80 px-4 py-3">
    <p className="text-xs font-medium text-text-secondary mb-0.5">{label}</p>
    <p className="text-sm text-brand font-medium">{value || '-'}</p>
  </div>
);

/* ---------- main component ---------- */
interface ProfileViewDisplayProps {
  member: Member;
  membershipStatus: MembershipStatus;
}

export function ProfileViewDisplay({ member, membershipStatus }: ProfileViewDisplayProps) {
  const { t } = useTranslation();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ---- Hero Header ---- */}
      <div className="relative rounded-xl overflow-hidden shadow-sm">
        {/* gradient banner */}
        <div className="h-32 md:h-40 bg-gradient-to-br from-brand via-brand-light to-indigo-500" />
        {/* content overlay */}
        <div className="bg-white px-5 md:px-8 pb-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10 md:-mt-12">
            {/* avatar + identity */}
            <div className="flex items-end gap-4">
              <div className="rounded-full ring-4 ring-white shadow-md">
                <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="xl" memberStatus={getAvatarMemberStatus(member)} />
              </div>
              <div className="pb-1">
                <h1 className="text-xl md:text-2xl font-bold text-brand leading-tight">{member.name}</h1>
                {member.nickname && <p className="text-sm text-text-secondary">&ldquo;{member.nickname}&rdquo;</p>}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <MembershipBadge status={membershipStatus} size="sm" />
                  {member.membership_expiry && (membershipStatus === 'premium' || membershipStatus === 'grace-period') && (
                    <span className="text-[11px] text-gray-400">{t.profile.membership.expiresOn} {formatDate(member.membership_expiry)}</span>
                  )}
                </div>
              </div>
            </div>
            {/* edit button */}
            <Link
              href="/profile?edit=true"
              className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-light transition-colors shadow-sm"
            >
              <IconPen />
              {t.profile.editProfile}
            </Link>
          </div>
          {/* meta line */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>{t.profile.memberSince} {formatDate(member.created_at)}</span>
            {member.abg_class && <span className="px-2 py-0.5 rounded-full bg-brand/5 text-brand-light font-medium">{member.abg_class}</span>}
          </div>
        </div>
      </div>

      {/* ---- About Section ---- */}
      <SectionCard icon={<IconUser />} title={t.profile.sections.about}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label="Email" value={member.email} />
          <InfoField label={t.onboard.form.role} value={member.role} />
          <InfoField label={t.onboard.form.company} value={member.company} />
          {member.phone && <InfoField label="Phone" value={member.phone} />}
          {member.country && <InfoField label="Country" value={member.country} />}
        </div>
        {member.bio && (
          <div className="mt-4 rounded-lg bg-brand/[0.03] border border-brand/10 px-4 py-3">
            <p className="text-xs font-medium text-text-secondary mb-1">Bio</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">{member.bio}</p>
          </div>
        )}
      </SectionCard>

      {/* ---- Expertise Section ---- */}
      <SectionCard icon={<IconStar />} title={t.profile.sections.expertise}>
        <div className="space-y-3">
          <InfoField label={t.onboard.form.expertise} value={member.expertise} />
          <InfoField label={t.onboard.form.canHelpWith} value={member.can_help_with} />
          <InfoField label={t.onboard.form.lookingFor} value={member.looking_for} />
        </div>
      </SectionCard>

      {/* ---- Career Opportunities ---- */}
      {(member.open_to_work || member.hiring) && (
        <SectionCard icon={<IconBriefcase />} title={t.profile.sections.career}>
          <div className="space-y-3">
            {member.open_to_work && (
              <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                <span className="text-emerald-600 mt-0.5"><IconCheck /></span>
                <div>
                  <p className="text-sm font-medium text-emerald-800">{t.onboard.form.openToWork}</p>
                  {member.job_preferences && <p className="text-sm text-emerald-700/80 mt-0.5">{member.job_preferences}</p>}
                </div>
              </div>
            )}
            {member.hiring && (
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 px-4 py-3">
                <span className="text-blue-600 mt-0.5"><IconCheck /></span>
                <div>
                  <p className="text-sm font-medium text-blue-800">{t.onboard.form.hiring}</p>
                  {member.hiring_preferences && <p className="text-sm text-blue-700/80 mt-0.5">{member.hiring_preferences}</p>}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ---- Personal Section ---- */}
      {(member.gender || member.relationship_status) && (
        <SectionCard icon={<IconHeart />} title={t.profile.sections.personal}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {member.gender && <InfoField label={t.onboard.form.gender} value={member.gender} />}
            {member.relationship_status && <InfoField label={t.onboard.form.relationshipStatus} value={member.relationship_status} />}
          </div>
        </SectionCard>
      )}

      {/* ---- Social Links ---- */}
      {(member.linkedin_url || member.facebook_url || member.company_website) && (
        <SectionCard icon={<IconLink />} title={t.profile.sections.social}>
          <div className="flex flex-wrap gap-3">
            {member.linkedin_url && (
              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077B5]/10 text-[#0077B5] text-sm font-medium hover:bg-[#0077B5]/20 transition-colors">
                <IconLink />LinkedIn
              </a>
            )}
            {member.facebook_url && (
              <a href={member.facebook_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1877F2]/10 text-[#1877F2] text-sm font-medium hover:bg-[#1877F2]/20 transition-colors">
                <IconLink />Facebook
              </a>
            )}
            {member.company_website && (
              <a href={member.company_website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition-colors">
                <IconLink />Website
              </a>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
