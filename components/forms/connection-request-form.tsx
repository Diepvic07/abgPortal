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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  partner: (
    // Network / handshake icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  love: (
    // Heart icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  job: (
    // Briefcase icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  hiring: (
    // Add user / recruit icon
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
};


const CATEGORY_STYLES = {
  partner: {
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
    border: 'border-violet-200',
    activeBorder: 'border-violet-500 ring-2 ring-violet-400/20',
    text: 'text-violet-700',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    focusRing: 'focus:ring-violet-400 focus:border-violet-400',
    button: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25',
  },
  love: {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    border: 'border-pink-200',
    activeBorder: 'border-pink-400 ring-2 ring-pink-400/20',
    text: 'text-pink-700',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    focusRing: 'focus:ring-pink-400 focus:border-pink-400',
    button: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-pink-500/25',
  },
  job: {
    gradient: 'from-brand to-brand-light',
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    activeBorder: 'border-brand ring-2 ring-brand/20',
    text: 'text-brand',
    iconBg: 'bg-blue-100',
    iconColor: 'text-brand',
    focusRing: 'focus:ring-brand focus:border-brand',
    button: 'bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand shadow-brand/25',
  },
  hiring: {
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/20',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    focusRing: 'focus:ring-emerald-400 focus:border-emerald-400',
    button: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25',
  },
} as const;

export function ConnectionRequestForm() {
  const { t, locale } = useTranslation();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchType, setMatchType] = useState<RequestCategory>('partner');
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywallType, setPaywallType] = useState<PaywallType>(null);
  const [quota, setQuota] = useState<{ remaining: number; total: number; tier: 'basic' | 'premium' } | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [userGender, setUserGender] = useState<string | undefined>();
  const [userStatus, setUserStatus] = useState<string | undefined>();
  const [profileCheckDone, setProfileCheckDone] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const schema = useMemo(() => createRequestSchema(t), [t]);

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
            const validStatus = relationship_status === 'Single' || relationship_status === 'Single (Available)';
            setNeedsProfileCompletion(!validGender || !validStatus);
          }
          setProfileCheckDone(true);
        })
        .catch(() => setProfileCheckDone(true));
    }
  }, [matchType, status, profileCheckDone]);

  useEffect(() => {
    if (matchType !== 'love') {
      setProfileCheckDone(false);
      setNeedsProfileCompletion(false);
    }
  }, [matchType]);

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
        let result;
        try { result = await response.json(); } catch { /* non-JSON */ }
        throw new Error(result?.error || t.common.error);
      }

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

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(t.common.error);
      }

      if (!response.ok) {
        if (response.status === 403) {
          setPaywallType('upgrade');
          return;
        }
        throw new Error(result.error || t.common.error);
      }

      setMatches(result.matches);
      setRequestId(result.request_id);
      if (result.quota) setQuota(result.quota);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSearch = () => {
    setMatches(null);
    setRequestId(null);
    setError(null);
  };

  if (matches && requestId) {
    return (
      <MatchResultsDisplay
        matches={matches}
        requestId={requestId}
        category={matchType}
        onNewSearch={handleNewSearch}
        quota={quota}
        onQuotaUpdate={setQuota}
      />
    );
  }

  if (paywallType) {
    return (
      <FakeResultsPaywall
        type={paywallType}
        matchType={matchType}
        onBack={() => setPaywallType(null)}
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const style = CATEGORY_STYLES[matchType];

  const categories: { key: RequestCategory; label: string; desc: string }[] = [
    { key: 'partner', label: t.dating.professionalNetwork, desc: t.dating.partnerDesc },
    { key: 'love', label: t.dating.findPartner, desc: t.dating.loveDesc },
    { key: 'job', label: t.dating.findJob, desc: t.dating.jobDesc },
    { key: 'hiring', label: t.dating.findCandidates, desc: t.dating.hiringDesc },
  ];

  const renderTabs = () => (
    <div className="grid grid-cols-2 gap-3" role="tablist">
      {categories.map(cat => {
        const isActive = matchType === cat.key;
        const catStyle = CATEGORY_STYLES[cat.key];
        return (
          <button
            key={cat.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMatchType(cat.key)}
            className={`relative p-4 rounded-2xl border text-left transition-all duration-200 group overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isActive
              ? `${catStyle.bg} ${catStyle.activeBorder} shadow-lg`
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            type="button"
          >
            {isActive && (
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${catStyle.gradient}`} aria-hidden="true" />
            )}
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? `${catStyle.iconBg} ${catStyle.iconColor}` : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                  }`}
              >
                {CATEGORY_ICONS[cat.key]}
              </span>
              <div className="min-w-0">
                <span className={`block text-sm font-semibold leading-tight ${isActive ? catStyle.text : 'text-gray-800'
                  }`}>
                  {cat.label}
                </span>
                <p className={`text-xs mt-0.5 leading-relaxed ${isActive ? 'text-gray-600' : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                  {cat.desc}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // Profile completion form for dating
  if (matchType === 'love' && needsProfileCompletion && status === 'authenticated') {
    return (
      <div className="space-y-8">
        {renderTabs()}

        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span aria-hidden="true" className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-lg">
              {'\u2764\uFE0F'}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-pink-900">
                {t.dating.completeProfile}
              </h3>
              <p className="text-sm text-pink-700">
                {t.dating.completeProfileDescription}
              </p>
            </div>
          </div>

          {completionError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
              {completionError}
            </div>
          )}

          <form onSubmit={handleProfileCompletion} className="space-y-4">
            <div>
              <label htmlFor="gender-select" className="block text-sm font-medium text-pink-900 mb-1.5">
                {t.onboard.form.gender} *
              </label>
              <select
                id="gender-select"
                name="gender"
                defaultValue={userGender || ''}
                className="w-full px-4 py-3 border border-pink-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all"
              >
                <option value="">{t.dating.selectGender}</option>
                <option value="Female">{t.onboard.form.genderFemale}</option>
                <option value="Male">{t.onboard.form.genderMale}</option>
              </select>
              <p className="text-pink-500 text-xs mt-1.5">{t.dating.genderNote}</p>
            </div>

            <div>
              <label htmlFor="status-select" className="block text-sm font-medium text-pink-900 mb-1.5">
                {t.onboard.form.relationshipStatus} *
              </label>
              <select
                id="status-select"
                name="relationship_status"
                defaultValue={userStatus || ''}
                className="w-full px-4 py-3 border border-pink-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all"
              >
                <option value="">{t.dating.selectStatus}</option>
                <option value="Single">{t.onboard.form.relationshipSingle}</option>
                <option value="Single (Available)">{t.onboard.form.relationshipAvailable}</option>
              </select>
              <p className="text-pink-500 text-xs mt-1.5">{t.dating.statusNote}</p>
            </div>

            <button
              type="submit"
              disabled={isCompletingProfile}
              className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
            >
              {isCompletingProfile ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>{t.common.loading}</span>
                </>
              ) : (
                t.dating.saveAndContinue
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderTabs()}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <svg aria-hidden="true" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className={`rounded-2xl border p-5 transition-all ${style.bg} ${style.border}`}>
          <label htmlFor="request-text" className={`block text-sm font-semibold mb-2 ${style.text}`}>
            {matchType === 'love' ? t.dating.idealMatch :
              matchType === 'job' ? t.dating.jobPreferences :
                matchType === 'hiring' ? t.dating.hiringPreferences :
                  t.request.form.requestText} *
          </label>
          <textarea
            id="request-text"
            {...register('request_text')}
            rows={4}
            className={`w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 transition-all resize-none ${style.focusRing}`}
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
            <p role="alert" className="text-red-600 text-sm mt-2">{errors.request_text.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 px-6 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg text-base ${style.button}`}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="text-white" />
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
