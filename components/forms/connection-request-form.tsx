'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MatchResultsDisplay } from '@/components/match-results-display';
import { FakeResultsPaywall } from '@/components/fake-results-paywall';
import { MatchResult, Member } from '@/types';
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

type MatchType = 'professional' | 'dating' | 'job' | 'hiring';
type PaywallType = 'sign-in' | 'upgrade' | null;

export function ConnectionRequestForm() {
  const { t, locale } = useTranslation();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchType, setMatchType] = useState<MatchType>('professional');
  const [matches, setMatches] = useState<MatchWithMember[] | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywallType, setPaywallType] = useState<PaywallType>(null);

  // Memoize schema to recreate when language changes
  const schema = useMemo(() => createRequestSchema(t), [t]);

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
        body: JSON.stringify({ request_text: data.request_text, type: matchType, locale }),
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

  const isDating = matchType === 'dating';

  return (
    <div className="space-y-6">
      {/* Toggle - Enhanced tab highlighting for better visibility */}
      <div className="flex p-1.5 bg-gray-100 rounded-xl mb-8 border border-gray-200 overflow-x-auto gap-1">
        <button
          onClick={() => setMatchType('professional')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${matchType === 'professional'
            ? 'bg-brand text-white shadow-md ring-2 ring-brand/30'
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          type="button"
        >
          {t.dating.professionalNetwork}
        </button>
        <button
          onClick={() => setMatchType('job')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${matchType === 'job'
            ? 'bg-brand text-white shadow-md ring-2 ring-brand/30'
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          type="button"
        >
          {t.dating.findJob}
        </button>
        <button
          onClick={() => setMatchType('hiring')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${matchType === 'hiring'
            ? 'bg-brand text-white shadow-md ring-2 ring-brand/30'
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          type="button"
        >
          {t.dating.findCandidates}
        </button>
        <button
          onClick={() => setMatchType('dating')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${matchType === 'dating'
            ? 'bg-pink-500 text-white shadow-md ring-2 ring-pink-500/30'
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          type="button"
        >
          {t.dating.findPartner}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-error/20 rounded-lg text-error">
            {error}
          </div>
        )}

{/* Removed redundant "signed in as" message - user status is visible in header menu */}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {matchType === 'dating' ? t.dating.idealMatch :
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
              matchType === 'dating'
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
              <span>{matchType === 'dating' ? t.dating.searching : t.request.form.submitting}</span>
            </>
          ) : (
            matchType === 'dating' ? t.dating.findMyMatch :
              matchType === 'job' ? t.dating.findJobBtn :
                matchType === 'hiring' ? t.dating.findCandidatesBtn :
                  t.request.form.submit
          )}
        </button>
      </form>
    </div>
  );
}
