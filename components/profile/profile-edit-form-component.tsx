'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/lib/i18n';
import type { Member } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { getAvatarMemberStatus } from '@/types';

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
    abg_class: z.string().optional().refine(v => v !== '__other__', { message: 'Please type your class name' }),
    nickname: z.string().optional(),
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
    // Dating profile fields
    self_description: z.string().optional(),
    truth_lie: z.string().optional(),
    ideal_day: z.string().optional(),
    qualities_looking_for: z.string().optional(),
    core_values: z.string().optional(),
    deal_breakers: z.string().optional(),
    interests: z.string().optional(),
    dating_message: z.string().optional(),
    other_share: z.string().optional(),
  });
}

type ProfileEditData = z.infer<ReturnType<typeof createProfileEditSchema>>;

interface ProfileEditFormComponentProps {
  member: Member;
}

export function ProfileEditFormComponent({ member }: ProfileEditFormComponentProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abgClassOptions, setAbgClassOptions] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(member.avatar_url || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch canonical class list for dropdown
  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(data => {
      if (data.classes) setAbgClassOptions(data.classes);
    }).catch(() => {});
  }, []);

  // Dating section state - open by default if user has any dating fields filled
  const [isDatingSectionOpen, setIsDatingSectionOpen] = useState(
    Boolean(member.self_description || member.interests || member.dating_message)
  );

  const schema = useMemo(() => createProfileEditSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
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
      // Dating profile fields
      self_description: member.self_description || '',
      truth_lie: member.truth_lie || '',
      ideal_day: member.ideal_day || '',
      qualities_looking_for: member.qualities_looking_for || '',
      core_values: member.core_values || '',
      deal_breakers: member.deal_breakers || '',
      interests: member.interests || '',
      dating_message: member.dating_message || '',
      other_share: member.other_share || '',
    },
  });

  const isOpenToWork = watch('open_to_work');
  const isHiring = watch('hiring');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileEditData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(key, value.toString());
      });
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
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
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="cursor-pointer relative group"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 group-hover:border-brand transition-colors"
                />
              ) : (
                <div className="relative">
                  <MemberAvatar name={member.name} size="xl" memberStatus={getAvatarMemberStatus(member)} />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-sm text-gray-500">
              {t.onboard.form.avatar}
            </p>
          </div>

          {/* Basic Info Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.profile.sections.about}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.onboard.form.email}
                </label>
                <input
                  type="email"
                  value={member.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.onboard.form.abgClass}</label>
                {watch('abg_class') === '__other__' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      onChange={(e) => setValue('abg_class', e.target.value === '' ? '__other__' : e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand"
                      placeholder={locale === 'vi' ? 'Nhập tên lớp ABG...' : 'Type your ABG class name...'}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setValue('abg_class', '')}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md"
                    >
                      {locale === 'vi' ? 'Quay lại' : 'Back'}
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('abg_class')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-brand bg-white"
                  >
                    <option value="">{t.onboard.form.abgClassPlaceholder}</option>
                    {abgClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__other__">{locale === 'vi' ? '— Khác (nhập tay)' : '— Other (type manually)'}</option>
                  </select>
                )}
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

          {/* Dating Profile Section - Collapsible */}
          <section className="pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsDatingSectionOpen(!isDatingSectionOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-lg font-semibold text-pink-600">
                {t.profile.sections.dating || 'Dating Profile'} (Optional)
              </h2>
              <span className="text-pink-500">
                {isDatingSectionOpen ? '▼' : '▶'}
              </span>
            </button>

            {isDatingSectionOpen && (
              <div className="mt-4 space-y-4 bg-pink-50 p-4 rounded-lg border border-pink-100">
                <p className="text-sm text-pink-700 mb-4">
                  {t.profile.datingDescription || 'Fill out this section to enhance your dating profile.'}
                </p>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.selfDescription || 'Describe yourself in 3 words'}
                  </label>
                  <input
                    {...register('self_description')}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.selfDescriptionPlaceholder || 'e.g., Creative, Adventurous, Thoughtful'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.truthLie || '2 Truths & 1 Lie'}
                  </label>
                  <textarea
                    {...register('truth_lie')}
                    rows={3}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.truthLiePlaceholder || 'Share 2 truths and 1 lie about yourself'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.idealDay || 'My Ideal Day'}
                  </label>
                  <textarea
                    {...register('ideal_day')}
                    rows={3}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.idealDayPlaceholder || 'Describe your perfect day...'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.qualitiesLookingFor || 'Qualities I Look For'}
                  </label>
                  <textarea
                    {...register('qualities_looking_for')}
                    rows={2}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.qualitiesPlaceholder || 'What qualities are you looking for in a partner?'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.coreValues || 'My Core Values'}
                  </label>
                  <textarea
                    {...register('core_values')}
                    rows={2}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.coreValuesPlaceholder || 'What values matter most to you?'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.dealBreakers || 'Deal Breakers'}
                  </label>
                  <textarea
                    {...register('deal_breakers')}
                    rows={2}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.dealBreakersPlaceholder || 'What are your relationship deal breakers?'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.interests || 'Hobbies & Interests'}
                  </label>
                  <textarea
                    {...register('interests')}
                    rows={2}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.interestsPlaceholder || 'What do you enjoy doing?'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.message || 'Message to Potential Matches'}
                  </label>
                  <textarea
                    {...register('dating_message')}
                    rows={3}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.messagePlaceholder || 'Write a message to someone who might be interested...'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-900 mb-1">
                    {t.profile.dating?.otherShare || 'Anything else to share?'}
                  </label>
                  <textarea
                    {...register('other_share')}
                    rows={2}
                    className="w-full px-4 py-3 border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder={t.profile.dating?.otherSharePlaceholder || 'Any other details...'}
                  />
                </div>
              </div>
            )}
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
