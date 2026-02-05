'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/lib/i18n';
import type { Member } from '@/types';

function createProfileEditSchema(t: { onboard: { validation: Record<string, string> } }) {
  return z.object({
    name: z.string().min(2, t.onboard.validation.nameRequired),
    role: z.string().min(2, t.onboard.validation.roleRequired),
    company: z.string().min(1, t.onboard.validation.companyRequired),
    expertise: z.string().min(10, t.onboard.validation.expertiseMin),
    can_help_with: z.string().min(10, t.onboard.validation.canHelpMin),
    looking_for: z.string().min(10, t.onboard.validation.lookingForMin),
    phone: z.string().optional(),
    country: z.string().optional(),
    abg_class: z.string().optional(),
    nickname: z.string().optional(),
    discord_username: z.string().optional(),
    linkedin_url: z.string().url().optional().or(z.literal('')),
    facebook_url: z.string().url().optional().or(z.literal('')),
    company_website: z.string().url().optional().or(z.literal('')),
    open_to_work: z.boolean().optional(),
    job_preferences: z.string().optional(),
    hiring: z.boolean().optional(),
    hiring_preferences: z.string().optional(),
    gender: z.enum(['Female', 'Male', 'Undisclosed']).optional(),
    relationship_status: z.string().optional(),
    display_nickname_in_search: z.boolean().optional(),
    display_nickname_in_match: z.boolean().optional(),
    display_nickname_in_email: z.boolean().optional(),
  });
}

type ProfileEditData = z.infer<ReturnType<typeof createProfileEditSchema>>;

interface ProfileEditFormComponentProps {
  member: Member;
}

export function ProfileEditFormComponent({ member }: ProfileEditFormComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => createProfileEditSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileEditData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member.name,
      role: member.role,
      company: member.company,
      expertise: member.expertise,
      can_help_with: member.can_help_with,
      looking_for: member.looking_for,
      phone: member.phone || '',
      country: member.country || '',
      abg_class: member.abg_class || '',
      nickname: member.nickname || '',
      discord_username: member.discord_username || '',
      linkedin_url: member.linkedin_url || '',
      facebook_url: member.facebook_url || '',
      company_website: member.company_website || '',
      open_to_work: member.open_to_work || false,
      job_preferences: member.job_preferences || '',
      hiring: member.hiring || false,
      hiring_preferences: member.hiring_preferences || '',
      gender: member.gender,
      relationship_status: member.relationship_status || '',
      display_nickname_in_search: member.display_nickname_in_search || false,
      display_nickname_in_match: member.display_nickname_in_match || false,
      display_nickname_in_email: member.display_nickname_in_email || false,
    },
  });

  const isOpenToWork = watch('open_to_work');
  const isHiring = watch('hiring');

  const onSubmit = async (data: ProfileEditData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      router.push('/profile');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.profile.editProfile}</h1>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="text-gray-600 hover:text-gray-900"
          >
            {t.profile.cancelEdit}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.about}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.fullName} *
                </label>
                <input
                  {...register('name')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.fullNamePlaceholder}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                <input
                  {...register('nickname')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Optional nickname"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.role} *
                </label>
                <input
                  {...register('role')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.rolePlaceholder}
                />
                {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.company} *
                </label>
                <input
                  {...register('company')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.companyPlaceholder}
                />
                {errors.company && <p className="text-red-600 text-sm mt-1">{errors.company.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ABG Class</label>
                <input
                  {...register('abg_class')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="e.g., 2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  {...register('phone')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  {...register('country')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Vietnam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.onboard.form.gender}</label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="">{t.onboard.form.genderUndisclosed}</option>
                  <option value="Female">{t.onboard.form.genderFemale}</option>
                  <option value="Male">{t.onboard.form.genderMale}</option>
                  <option value="Undisclosed">{t.onboard.form.genderUndisclosed}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Expertise Section */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.expertise}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.expertise} *
                </label>
                <textarea
                  {...register('expertise')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.expertisePlaceholder}
                />
                {errors.expertise && <p className="text-red-600 text-sm mt-1">{errors.expertise.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.canHelpWith} *
                </label>
                <textarea
                  {...register('can_help_with')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.canHelpWithPlaceholder}
                />
                {errors.can_help_with && <p className="text-red-600 text-sm mt-1">{errors.can_help_with.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.lookingFor} *
                </label>
                <textarea
                  {...register('looking_for')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder={t.onboard.form.lookingForPlaceholder}
                />
                {errors.looking_for && <p className="text-red-600 text-sm mt-1">{errors.looking_for.message}</p>}
              </div>
            </div>
          </section>

          {/* Career Section */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.onboard.form.sectionCareer}</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  {...register('open_to_work')}
                  type="checkbox"
                  id="open_to_work"
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <label htmlFor="open_to_work" className="text-sm font-medium text-gray-700">
                  {t.onboard.form.openToWork}
                </label>
              </div>

              {isOpenToWork && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.onboard.form.jobPreferences}
                  </label>
                  <textarea
                    {...register('job_preferences')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                    placeholder={t.onboard.form.jobPreferencesPlaceholder}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  {...register('hiring')}
                  type="checkbox"
                  id="hiring"
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <label htmlFor="hiring" className="text-sm font-medium text-gray-700">
                  {t.onboard.form.hiring}
                </label>
              </div>

              {isHiring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.onboard.form.hiringPreferences}
                  </label>
                  <textarea
                    {...register('hiring_preferences')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                    placeholder={t.onboard.form.hiringPreferencesPlaceholder}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Personal Section */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.personal}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.onboard.form.relationshipStatus}
              </label>
              <select
                {...register('relationship_status')}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
              >
                <option value="">{t.onboard.form.relationshipPreferNotToSay}</option>
                <option value="Single">{t.onboard.form.relationshipSingle}</option>
                <option value="Single (Available)">{t.onboard.form.relationshipAvailable}</option>
                <option value="In a Relationship">{t.onboard.form.relationshipInRelationship}</option>
                <option value="Married">{t.onboard.form.relationshipMarried}</option>
              </select>
            </div>
          </section>

          {/* Social Links Section */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.social}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input
                  {...register('linkedin_url')}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.linkedin_url && <p className="text-red-600 text-sm mt-1">{errors.linkedin_url.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                <input
                  {...register('facebook_url')}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="https://facebook.com/yourprofile"
                />
                {errors.facebook_url && <p className="text-red-600 text-sm mt-1">{errors.facebook_url.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
                <input
                  {...register('company_website')}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="https://yourcompany.com"
                />
                {errors.company_website && <p className="text-red-600 text-sm mt-1">{errors.company_website.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discord Username</label>
                <input
                  {...register('discord_username')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="username#1234"
                />
              </div>
            </div>
          </section>

          {/* Privacy Settings */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.privacy}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  {...register('display_nickname_in_search')}
                  type="checkbox"
                  id="display_nickname_in_search"
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <label htmlFor="display_nickname_in_search" className="text-sm text-gray-700">
                  {t.profile.privacy.displayNicknameInSearch}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  {...register('display_nickname_in_match')}
                  type="checkbox"
                  id="display_nickname_in_match"
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <label htmlFor="display_nickname_in_match" className="text-sm text-gray-700">
                  {t.profile.privacy.displayNicknameInMatch}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  {...register('display_nickname_in_email')}
                  type="checkbox"
                  id="display_nickname_in_email"
                  className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand"
                />
                <label htmlFor="display_nickname_in_email" className="text-sm text-gray-700">
                  {t.profile.privacy.displayNicknameInEmail}
                </label>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              {t.profile.cancelEdit}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.common.loading : t.profile.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
