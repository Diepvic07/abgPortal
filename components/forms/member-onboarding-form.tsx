'use client';

import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SignInButton } from '@/components/ui/sign-in-button';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { PaymentInfoModal } from '@/components/ui/payment-info-modal';
import { useTranslation, type Locale } from '@/lib/i18n';

// Create schema with translated messages
function createOnboardingSchema(t: { onboard: { validation: Record<string, string> } }) {
  return z.object({
    name: z.string().min(2, t.onboard.validation.nameRequired),
    email: z.string().email(t.onboard.validation.emailRequired),
    role: z.string().min(2, t.onboard.validation.roleRequired),
    company: z.string().min(1, t.onboard.validation.companyRequired),
    expertise: z.string().min(10, t.onboard.validation.expertiseMin),
    can_help_with: z.string().min(10, t.onboard.validation.canHelpMin),
    looking_for: z.string().min(10, t.onboard.validation.lookingForMin),
    abg_class: z.string().optional(),
    nickname: z.string().max(50).optional(),
    display_nickname_in_search: z.boolean().optional(),
    display_nickname_in_match: z.boolean().optional(),
    display_nickname_in_email: z.boolean().optional(),
    discord_username: z.string().max(100).optional(),
    open_to_work: z.boolean().optional(),
    job_preferences: z.string().optional(),
    hiring: z.boolean().optional(),
    hiring_preferences: z.string().optional(),
    gender: z.enum(['Female', 'Male', 'Undisclosed']).optional(),
    relationship_status: z.string().optional(),
  });
}

type OnboardingData = z.infer<ReturnType<typeof createOnboardingSchema>>;

export function MemberOnboardingForm() {
  const { t, locale } = useTranslation();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedBio, setGeneratedBio] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Memoize schema to recreate when language changes
  const schema = useMemo(() => createOnboardingSchema(t), [t]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<OnboardingData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      open_to_work: false,
      hiring: false,
    }
  });

  // Sync session data when it becomes available
  useMemo(() => {
    if (session?.user?.email) {
      setValue('email', session.user.email);
    }
    if (session?.user?.name) {
      setValue('name', session.user.name);
    }
  }, [session, setValue]);

  const isOpenToWork = watch('open_to_work');
  const isHiring = watch('hiring');

  const watchedName = watch('name', '');

  const onSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(key, value.toString());
      });

      // Include locale for email language
      formData.append('locale', locale);

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      if (voiceFile) {
        formData.append('voice', voiceFile);
      }

      const response = await fetch('/api/onboard', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      setGeneratedBio(result.bio);
      setMemberId(result.memberId);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-success mb-4">{t.onboard.success.title}</h2>
          <p className="text-text-secondary mb-4">{t.onboard.success.checkEmail}</p>
          {generatedBio && (
            <div className="mt-6 p-4 bg-bg-surface rounded-lg text-left shadow">
              <p className="text-sm font-medium text-text-primary mb-2">{t.onboard.success.generatedBio}</p>
              <p className="text-text-secondary italic">{generatedBio}</p>
            </div>
          )}
          {memberId && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="mt-6 py-3 px-6 bg-brand text-white rounded-md font-medium hover:bg-brand-dark transition-colors"
            >
              {t.onboard.success.completePayment}
            </button>
          )}
        </div>

        {memberId && (
          <PaymentInfoModal
            memberId={memberId}
            memberName={watchedName}
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
          />
        )}
      </>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t.auth.signInRequired}
          </h2>
          <p className="text-gray-600">
            {t.auth.signInDescription}
          </p>
        </div>
        <SignInButton className="mx-auto" />
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {/* Avatar upload section */}
      <div className="flex flex-col items-center gap-3">
        <div
          onClick={() => avatarInputRef.current?.click()}
          className="cursor-pointer relative group"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-border group-hover:border-brand transition-colors"
            />
          ) : (
            <div className="relative">
              <MemberAvatar name={watchedName || 'A'} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
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
        <p className="text-sm text-text-secondary">
          {t.onboard.form.avatar}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.fullName} *
          </label>
          <input
            {...register('name')}
            className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            placeholder={t.onboard.form.fullNamePlaceholder}
          />
          {errors.name && (
            <p className="text-error text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.email} *
          </label>
          <input
            {...register('email')}
            type="email"
            readOnly
            className="w-full px-4 py-3 border border-border bg-gray-50 rounded-md cursor-not-allowed opacity-75"
            placeholder={t.onboard.form.emailPlaceholder}
          />
          <p className="text-xs text-text-secondary mt-1">
            {t.request.form.emailHelp}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.abgClass}
        </label>
        <input
          {...register('abg_class')}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder={t.onboard.form.abgClassPlaceholder}
        />
        <p className="text-xs text-text-secondary mt-1">
          {t.onboard.form.abgClassHelp}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-primary">
          {t.onboard.form.nicknameSection}
        </label>

        <input
          {...register('nickname')}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder={t.onboard.form.nicknamePlaceholder}
        />
        <p className="text-xs text-text-secondary">
          {t.onboard.form.nicknameHelp}
        </p>

        <div className="ml-4 space-y-2">
          <p className="text-sm text-text-secondary mb-2">{t.onboard.form.displayNicknameWhere}</p>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="display_nickname_in_search"
              {...register('display_nickname_in_search')}
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="display_nickname_in_search" className="text-sm text-text-primary">
              {t.onboard.form.displayInSearch}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="display_nickname_in_match"
              {...register('display_nickname_in_match')}
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="display_nickname_in_match" className="text-sm text-text-primary">
              {t.onboard.form.displayInMatch}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="display_nickname_in_email"
              {...register('display_nickname_in_email')}
              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="display_nickname_in_email" className="text-sm text-text-primary">
              {t.onboard.form.displayInEmail}
            </label>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.role} *
          </label>
          <input
            {...register('role')}
            className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            placeholder={t.onboard.form.rolePlaceholder}
          />
          {errors.role && (
            <p className="text-error text-sm mt-1">{errors.role.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.company} *
          </label>
          <input
            {...register('company')}
            className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            placeholder={t.onboard.form.companyPlaceholder}
          />
          {errors.company && (
            <p className="text-error text-sm mt-1">{errors.company.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.expertise} *
        </label>
        <textarea
          {...register('expertise')}
          rows={2}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder={t.onboard.form.expertisePlaceholder}
        />
        {errors.expertise && (
          <p className="text-error text-sm mt-1">{errors.expertise.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.canHelpWith} *
        </label>
        <textarea
          {...register('can_help_with')}
          rows={2}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder={t.onboard.form.canHelpWithPlaceholder}
        />
        {errors.can_help_with && (
          <p className="text-error text-sm mt-1">{errors.can_help_with.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.lookingFor} *
        </label>
        <textarea
          {...register('looking_for')}
          rows={2}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder={t.onboard.form.lookingForPlaceholder}
        />
        {errors.looking_for && (
          <p className="text-error text-sm mt-1">{errors.looking_for.message}</p>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-medium text-text-primary">{t.onboard.form.sectionCareer}</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="open_to_work"
              {...register('open_to_work')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="open_to_work" className="text-sm font-medium text-text-primary">
              {t.onboard.form.openToWork}
            </label>
          </div>

          {isOpenToWork && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t.onboard.form.jobPreferences}
              </label>
              <textarea
                {...register('job_preferences')}
                rows={2}
                className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                placeholder={t.onboard.form.jobPreferencesPlaceholder}
              />
            </div>
          )}

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="hiring"
              {...register('hiring')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="hiring" className="text-sm font-medium text-text-primary">
              {t.onboard.form.hiring}
            </label>
          </div>

          {isHiring && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t.onboard.form.hiringPreferences}
              </label>
              <textarea
                {...register('hiring_preferences')}
                rows={2}
                className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                placeholder={t.onboard.form.hiringPreferencesPlaceholder}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.gender}
          </label>
          <select
            {...register('gender')}
            className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          >
            <option value="">{t.onboard.form.genderUndisclosed}</option>
            <option value="Female">{t.onboard.form.genderFemale}</option>
            <option value="Male">{t.onboard.form.genderMale}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t.onboard.form.relationshipStatus}
          </label>
          <select
            {...register('relationship_status')}
            className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          >
            <option value="">{t.onboard.form.relationshipPreferNotToSay}</option>
            <option value="Single">{t.onboard.form.relationshipSingle}</option>
            <option value="Single (Available)">{t.onboard.form.relationshipAvailable}</option>
            <option value="In a Relationship">{t.onboard.form.relationshipInRelationship}</option>
            <option value="Married">{t.onboard.form.relationshipMarried}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.discordUsername}
        </label>
        <input
          {...register('discord_username')}
          className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
          placeholder="username"
        />
        <p className="text-sm text-text-secondary mt-1">
          {t.onboard.form.discordHelp}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t.onboard.form.voice}
        </label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
          className="w-full px-4 py-3 border border-border rounded-md"
        />
        <p className="text-sm text-text-secondary mt-1">
          {t.onboard.form.voiceHelp}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-brand text-white rounded-md font-medium hover:bg-brand-dark disabled:bg-brand/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" />
            <span>{t.onboard.form.submitting}</span>
          </>
        ) : (
          t.onboard.form.submit
        )}
      </button>
    </form>
  );
}
