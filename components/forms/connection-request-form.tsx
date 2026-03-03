'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MatchResultsDisplay } from '@/components/match-results-display';
import { FakeResultsPaywall } from '@/components/fake-results-paywall';
import { MatchResult, Member, RequestCategory } from '@/types';
import { useTranslation } from '@/lib/i18n';

// Create schema with translated messages
function createRequestSchema(t: { request: { validation: Record<string, string> } }) {
  return z.object({
    request_text: z.string().min(20, t.request.validation.requestMin),
  });
}

type RequestData = z.infer<ReturnType<typeof createRequestSchema>>;

interface MatchWithMember extends MatchResult {
  member: Member;
}

type PaywallType = 'sign-in' | 'upgrade' | null;

export function ConnectionRequestForm() {
  const { t, locale } = useTranslation();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchType, setMatchType] = useState<RequestCategory>('partner');
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywallType, setPaywallType] = useState<PaywallType>(null);
  // Dating profile completion state
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [userGender, setUserGender] = useState<string | undefined>();
  const [userStatus, setUserStatus] = useState<string | undefined>();
  const [profileCheckDone, setProfileCheckDone] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Memoize schema to recreate when language changes
  const schema = useMemo(() => createRequestSchema(t), [t]);

  // Check profile when dating tab selected
  useEffect(() => {
    if (matchType === 'love' && status === 'authenticated' && !profileCheckDone) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.member) {
            const { gender, relationship_status } = data.member;
            setUserGender(gender);
            setUserStatus(relationship_status);

            const validGender = gender === 'Male' || gender === 'Female';
            // Accept both "Single" and "Single (Available)" per validation session
            const validStatus = relationship_status === 'Single' || relationship_status === 'Single (Available)';

            setNeedsProfileCompletion(!validGender || !validStatus);
          }
          setProfileCheckDone(true);
        })
        .catch(() => setProfileCheckDone(true));
    }
  }, [matchType, status, profileCheckDone]);

  // Reset profile check when switching away from dating
  useEffect(() => {
    if (matchType !== 'love') {
      setProfileCheckDone(false);
      setNeedsProfileCompletion(false);
    }
  }, [matchType]);

  // Handle dating profile completion form submission
  const handleProfileCompletion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gender = formData.get('gender') as string;
    const relationship_status = formData.get('relationship_status') as string;

    if (!gender || !relationship_status) {
      setCompletionError(t.common.required);
      return;
    }

    setIsCompletingProfile(true);
    setCompletionError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, relationship_status }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || t.common.error);
      }

      // Success - re-check profile
      setNeedsProfileCompletion(false);
      setProfileCheckDone(false);
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsCompletingProfile(false);
    }
  };

  const { register, handleSubmit, formState: { errors } } = useForm<RequestData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: RequestData) => {
    // If user is not authenticated, show sign-in paywall with fake results
    if (status === 'unauthenticated') {
      setPaywallType('sign-in');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMatches(null);
    setPaywallType(null);

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: data.request_text, category: matchType, locale }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if error is due to free request limit reached (403)
        // Show upgrade paywall for any 403 payment-related error
        if (response.status === 403) {
          setPaywallType('upgrade');
          return;
        }
        throw new Error(result.error || t.common.error);
      }

      setMatches(result.matches);
      setRequestId(result.request_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show real results for authenticated users with valid requests
  if (matches && requestId) {
    return (
      <MatchResultsDisplay
        matches={matches}
        requestId={requestId}
        category={matchType}
      />
    );
  }

  // Show fake results with paywall overlay
  if (paywallType) {
    return (
      <FakeResultsPaywall
        type={paywallType}
        matchType={matchType}
        onBack={() => setPaywallType(null)}
      />
    );
  }

  // Show loading spinner only during initial session check
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const isDating = matchType === 'love';

  // Render tab buttons (extracted to reuse)
  const categories: { key: RequestCategory; label: string; icon: string; desc: string; color: string }[] = [
    { key: 'love', label: t.dating.findPartner || 'Love Matching', icon: '❤️', desc: 'Find a romantic partner within the verified alumni network', color: 'pink-500' },
    { key: 'job', label: t.dating.findJob || 'Job Hunting', icon: '💼', desc: 'Discover open roles or connect with mentors/recruiters', color: 'brand' },
    { key: 'hiring', label: t.dating.findCandidates || 'Recruitment', icon: '👥', desc: 'Find talent for available job positions', color: 'brand' },
    { key: 'partner', label: t.dating.professionalNetwork || 'Partner Matching', icon: '🤝', desc: 'Connect for business partnerships or networking', color: 'brand' },
  ];

  const renderTabs = () => (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {categories.map(cat => (
        <button
          key={cat.key}
          onClick={() => setMatchType(cat.key)}
          className={`p-4 rounded-xl border-2 text-left transition-all ${matchType === cat.key
            ? cat.key === 'love'
              ? 'border-pink-500 bg-pink-50 shadow-md ring-2 ring-pink-500/20'
              : 'border-brand bg-blue-50 shadow-md ring-2 ring-brand/20'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          type="button"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{cat.icon}</span>
            <span className={`text-sm font-semibold ${matchType === cat.key
              ? cat.key === 'love' ? 'text-pink-700' : 'text-brand'
              : 'text-gray-700'
              }`}>{cat.label}</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{cat.desc}</p>
        </button>
      ))}
    </div>
  );

  // Show profile completion form for dating if needed
  if (matchType === 'love' && needsProfileCompletion && status === 'authenticated') {
    return (
      <div className="space-y-6">
        {renderTabs()}

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-2">
            {t.dating.completeProfile || 'Complete Your Profile'}
          </h3>
          <p className="text-pink-700 mb-4">
            {t.dating.completeProfileDescription || 'To use the dating feature, please provide your gender and confirm your availability status.'}
          </p>

          {completionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
              {completionError}
            </div>
          )}

          <form onSubmit={handleProfileCompletion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-pink-900 mb-1">
                {t.onboard.form.gender} *
              </label>
              <select
                name="gender"
                defaultValue={userGender || ''}
                className="w-full px-4 py-3 border border-pink-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">{t.dating.selectGender || 'Select your gender'}</option>
                <option value="Female">{t.onboard.form.genderFemale}</option>
                <option value="Male">{t.onboard.form.genderMale}</option>
              </select>
              <p className="text-pink-600 text-xs mt-1">
                {t.dating.genderNote || 'Note: "Undisclosed" is not available for dating feature'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-pink-900 mb-1">
                {t.onboard.form.relationshipStatus} *
              </label>
              <select
                name="relationship_status"
                defaultValue={userStatus || ''}
                className="w-full px-4 py-3 border border-pink-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">{t.dating.selectStatus || 'Select status'}</option>
                <option value="Single">{t.onboard.form.relationshipSingle}</option>
                <option value="Single (Available)">{t.onboard.form.relationshipAvailable}</option>
              </select>
              <p className="text-pink-600 text-xs mt-1">
                {t.dating.statusNote || 'Only single members can use the dating feature'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isCompletingProfile}
              className="w-full py-3 px-6 bg-pink-500 text-white rounded-md font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCompletingProfile ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>{t.common.loading}</span>
                </>
              ) : (
                t.dating.saveAndContinue || 'Save & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderTabs()}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-error/20 rounded-lg text-error">
            {error}
          </div>
        )}

{/* Removed redundant "signed in as" message - user status is visible in header menu */}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {matchType === 'love' ? t.dating.idealMatch :
              matchType === 'job' ? t.dating.jobPreferences :
                matchType === 'hiring' ? t.dating.hiringPreferences :
                  t.request.form.requestText} *
          </label>
          <textarea
            {...register('request_text')}
            rows={4}
            className={`w-full px-4 py-3 border border-border rounded-md focus:ring-2 transition-colors ${isDating ? 'focus:ring-pink-500 focus:border-pink-500' : 'focus:ring-brand focus:border-brand'
              }`}
            placeholder={
              matchType === 'love'
                ? t.dating.idealMatchPlaceholder
                : matchType === 'job'
                  ? t.dating.jobPreferencesPlaceholder
                  : matchType === 'hiring'
                    ? t.dating.hiringPreferencesPlaceholder
                    : t.request.form.requestTextPlaceholder
            }
          />
          {errors.request_text && (
            <p className="text-error text-sm mt-1">{errors.request_text.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3.5 px-6 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${isDating ? 'bg-pink-500 hover:bg-pink-600' : 'bg-brand hover:bg-brand-dark'
            }`}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>{matchType === 'love' ? t.dating.searching : t.request.form.submitting}</span>
            </>
          ) : (
            matchType === 'love' ? t.dating.findMyMatch :
              matchType === 'job' ? t.dating.findJobBtn :
                matchType === 'hiring' ? t.dating.findCandidatesBtn :
                  t.request.form.submit
          )}
        </button>
      </form>
    </div>
  );
}
