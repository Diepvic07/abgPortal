'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MembershipBadge } from '@/components/ui/membership-badge';
import type { Member, MembershipStatus } from '@/types';

interface ProfileViewDisplayProps {
  member: Member;
  membershipStatus: MembershipStatus;
}

export function ProfileViewDisplay({ member, membershipStatus }: ProfileViewDisplayProps) {
  const { t } = useTranslation();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              {member.nickname && (
                <p className="text-gray-600">"{member.nickname}"</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <MembershipBadge status={membershipStatus} size="md" />
              </div>
            </div>
          </div>
          <Link
            href="/profile?edit=true"
            className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {t.profile.editProfile}
          </Link>
        </div>

        <div className="text-sm text-gray-500 mb-6">
          {t.profile.memberSince} {formatDate(member.created_at)}
        </div>

        {/* About Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.profile.sections.about}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{member.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.onboard.form.role}</label>
              <p className="text-gray-900">{member.role || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.onboard.form.company}</label>
              <p className="text-gray-900">{member.company || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">ABG Class</label>
              <p className="text-gray-900">{member.abg_class || '-'}</p>
            </div>
            {member.phone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{member.phone}</p>
              </div>
            )}
            {member.country && (
              <div>
                <label className="text-sm font-medium text-gray-700">Country</label>
                <p className="text-gray-900">{member.country}</p>
              </div>
            )}
          </div>
          {member.bio && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Bio</label>
              <p className="text-gray-700 italic mt-1">{member.bio}</p>
            </div>
          )}
        </section>

        {/* Expertise Section */}
        <section className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.profile.sections.expertise}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.onboard.form.expertise}</label>
              <p className="text-gray-900">{member.expertise || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.onboard.form.canHelpWith}</label>
              <p className="text-gray-900">{member.can_help_with || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.onboard.form.lookingFor}</label>
              <p className="text-gray-900">{member.looking_for || '-'}</p>
            </div>
          </div>
        </section>

        {/* Career Opportunities Section */}
        {(member.open_to_work || member.hiring) && (
          <section className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.profile.sections.career}</h2>
            <div className="space-y-3">
              {member.open_to_work && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">{t.onboard.form.openToWork}</label>
                  </div>
                  {member.job_preferences && (
                    <p className="text-gray-900 ml-6">{member.job_preferences}</p>
                  )}
                </div>
              )}
              {member.hiring && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <label className="text-sm font-medium text-gray-700">{t.onboard.form.hiring}</label>
                  </div>
                  {member.hiring_preferences && (
                    <p className="text-gray-900 ml-6">{member.hiring_preferences}</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Personal Section */}
        {(member.gender || member.relationship_status) && (
          <section className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.profile.sections.personal}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {member.gender && (
                <div>
                  <label className="text-sm font-medium text-gray-700">{t.onboard.form.gender}</label>
                  <p className="text-gray-900">{member.gender}</p>
                </div>
              )}
              {member.relationship_status && (
                <div>
                  <label className="text-sm font-medium text-gray-700">{t.onboard.form.relationshipStatus}</label>
                  <p className="text-gray-900">{member.relationship_status}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Social Links Section */}
        {(member.linkedin_url || member.facebook_url || member.company_website || member.discord_username) && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.profile.sections.social}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {member.linkedin_url && (
                <div>
                  <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                  <a
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {member.linkedin_url}
                  </a>
                </div>
              )}
              {member.facebook_url && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Facebook</label>
                  <a
                    href={member.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {member.facebook_url}
                  </a>
                </div>
              )}
              {member.company_website && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Company Website</label>
                  <a
                    href={member.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {member.company_website}
                  </a>
                </div>
              )}
              {member.discord_username && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Discord</label>
                  <p className="text-gray-900">{member.discord_username}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
