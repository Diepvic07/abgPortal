'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession, signIn } from 'next-auth/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { PaymentInfoModal } from '@/components/ui/payment-info-modal';
import { useTranslation } from '@/lib/i18n';

const ONBOARDING_STORAGE_KEY = 'abg_onboarding_draft';

// Create schema with translated messages
// Email is optional in schema - for unauthenticated users it will be filled after OAuth
function createOnboardingSchema(t: { onboard: { validation: Record<string, string> } }) {
  return z.object({
    name: z.string().min(2, t.onboard.validation.nameRequired),
    email: z.string().email(t.onboard.validation.emailRequired).optional().or(z.literal('')),
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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedBio, setGeneratedBio] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Memoize schema to recreate when language changes
  const schema = useMemo(() => createOnboardingSchema(t), [t]);

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<OnboardingData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      open_to_work: false,
      hiring: false,
    }
  });

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        Object.entries(draft).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            setValue(key as keyof OnboardingData, value as OnboardingData[keyof OnboardingData]);
          }
        });
        // If user just signed in and has pending draft, auto-submit
        if (status === 'authenticated' && draft._pendingSubmit) {
          setPendingSubmit(true);
        }
      } catch {
        // Invalid JSON, clear it
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }
  }, [setValue, status]);

  // Sync session data when it becomes available
  useEffect(() => {
    if (session?.user?.email) {
      setValue('email', session.user.email);
    }
    if (session?.user?.name && !getValues('name')) {
      setValue('name', session.user.name);
    }
  }, [session, setValue, getValues]);

  // Auto-submit after sign-in if there was a pending submission
  useEffect(() => {
    if (pendingSubmit && status === 'authenticated') {
      setPendingSubmit(false);
      // Submit button will be clicked programmatically
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) {
        // Clear storage before submit
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        submitBtn.click();
      }
    }
  }, [pendingSubmit, status]);

  const isOpenToWork = watch('open_to_work');
  const isHiring = watch('hiring');

  const watchedName = watch('name', '');

  const onSubmit = async (data: OnboardingData) => {
    // If not authenticated, save form data and trigger sign-in
    if (status === 'unauthenticated') {
      const draftData = { ...data, _pendingSubmit: true };
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draftData));
      // Redirect to sign-in, then back to /onboard to complete submission
      signIn('google', { callbackUrl: '/onboard' });
      return;
    }

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

      const response = await fetch('/api/onboard', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      // Clear any saved draft on success
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);

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
        <div className="flex flex-col items-center text-center py-8 gap-6">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-md">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title & subtitle */}
          <div>
            <h2 className="text-3xl font-bold text-brand mb-2">{t.onboard.success.title}</h2>
            <p className="text-text-secondary text-base">{t.onboard.success.checkEmail}</p>
          </div>

          {/* Generated bio card */}
          {generatedBio && (
            <div className="w-full p-5 bg-bg-primary rounded-xl border border-border text-left shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-brand">{t.onboard.success.generatedBio}</p>
              </div>
              <p className="text-text-secondary italic leading-relaxed text-sm">{generatedBio}</p>
            </div>
          )}

          {/* CTA button */}
          {memberId && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-4 px-6 bg-brand text-white rounded-xl font-semibold text-base hover:bg-brand-dark active:scale-95 transition-all duration-150 shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
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
          {status === 'authenticated' ? (
            <>
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
              <p className="text-xs text-brand mt-2 font-medium bg-brand/5 p-2 rounded border border-brand/10">
                {t.onboard.form.autoApproveNote}
              </p>
            </>
          ) : (
            <>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                placeholder="your@email.com"
              />
              <p className="text-xs text-text-secondary mt-1">
                {t.onboard.form.emailRequired}
              </p>
              <p className="text-xs text-brand mt-2 font-medium bg-brand/5 p-2 rounded border border-brand/10">
                {t.onboard.form.autoApproveNote}
              </p>
            </>
          )}
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
            <option value="">{t.onboard.form.gender}</option>
            <option value="Female">{t.onboard.form.genderFemale}</option>
            <option value="Male">{t.onboard.form.genderMale}</option>
            <option value="Undisclosed">{t.onboard.form.genderUndisclosed}</option>
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

      {/* Authenticated: single submit button */}
      {status === 'authenticated' && (
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
      )}

      {/* Loading auth state */}
      {status === 'loading' && (
        <button
          type="button"
          disabled
          className="w-full py-3.5 px-6 bg-brand/50 text-white rounded-md font-medium cursor-not-allowed flex items-center justify-center gap-2"
        >
          <LoadingSpinner size="sm" />
          <span>{t.common.loading}</span>
        </button>
      )}

      {/* Unauthenticated: magic link sent confirmation */}
      {status === 'unauthenticated' && magicLinkSent && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
          <p className="font-medium">{t.onboard.form.magicLinkSent}</p>
        </div>
      )}

      {/* Unauthenticated: dual auth buttons */}
      {status === 'unauthenticated' && !magicLinkSent && (
        <div className="space-y-3">
          {/* Magic Link button */}
          <button
            type="button"
            disabled={magicLinkLoading}
            onClick={async () => {
              const emailValue = getValues('email');
              if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                setError(t.onboard.validation.emailRequired);
                return;
              }
              setError(null);
              setMagicLinkLoading(true);
              try {
                const res = await fetch('/api/auth/check-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // intent signup to avoid member existence errors for new users
                  body: JSON.stringify({ email: emailValue.trim().toLowerCase(), intent: 'signup' }),
                });
                const data = await res.json();

                if (data.isTestMode && !data.adminEmails.includes(emailValue.trim().toLowerCase())) {
                  setError(locale === 'vi'
                    ? 'Hệ thống đang ở chế độ test. Chỉ gửi được email cho admin. Hãy dùng Google Sign-In.'
                    : 'System is in test mode. Cannot send email to this address. Please use Google Sign-In.');
                  setMagicLinkLoading(false);
                  return;
                }

                // Save draft for auto-resume after magic link auth
                const draftData = { ...getValues(), _pendingSubmit: true };
                localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(draftData));
                const result = await signIn('email', {
                  email: emailValue,
                  redirect: false,
                  callbackUrl: '/onboard',
                });
                if (result?.error) {
                  console.error('Magic link sign-in error:', result.error);
                  // Provide user-friendly error instead of raw NextAuth error code
                  const friendlyError = result.error === 'EmailSignin'
                    ? (locale === 'vi'
                      ? 'Không thể gửi magic link. Email có thể chưa được xác minh trong hệ thống. Hãy thử đăng nhập bằng Google.'
                      : 'Could not send magic link. The email may not be verified in our system. Please try Google Sign-In instead.')
                    : `${t.common.error}: ${result.error}`;
                  setError(friendlyError);
                } else {
                  setMagicLinkSent(true);
                }
              } catch (err) {
                console.error('Magic link exception:', err);
                setError(err instanceof Error ? `${t.common.error}: ${err.message}` : t.common.error);
              } finally {
                setMagicLinkLoading(false);
              }
            }}
            className="w-full py-3.5 px-6 bg-brand text-white rounded-md font-medium hover:bg-brand-dark disabled:bg-brand/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {magicLinkLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>{t.onboard.form.submitting}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{t.onboard.form.sendMagicLink}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-text-secondary">{t.onboard.form.orDivider}</span>
            </div>
          </div>

          {/* Google OAuth button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 border border-border rounded-md font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-text-primary">{t.onboard.form.continueWithGoogle}</span>
          </button>
        </div>
      )}
    </form>
  );
}
