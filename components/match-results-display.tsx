'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MatchResult, Member } from '@/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation, interpolate } from '@/lib/i18n';

interface MatchWithMember extends MatchResult {
  member: Member;
}

interface QuotaInfo {
  remaining: number;
  total: number;
  tier: 'basic' | 'premium';
}

interface MatchResultsDisplayProps {
  matches: MatchWithMember[];
  requestId: string;
  category?: string;
  onNewSearch?: () => void;
  quota?: QuotaInfo | null;
  onQuotaUpdate?: (quota: QuotaInfo) => void;
}

export function MatchResultsDisplay({ matches: initialMatches, requestId, category, onNewSearch, quota, onQuotaUpdate }: MatchResultsDisplayProps) {
  const { t, locale } = useTranslation();
  const [matches, setMatches] = useState<MatchWithMember[]>(initialMatches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [customIntro, setCustomIntro] = useState('');

  const { data: session } = useSession();
  const [requesterClass, setRequesterClass] = useState<string>('');

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.member?.abg_class) {
            setRequesterClass(data.member.abg_class);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  // Reroll state
  const [isRerolling, setIsRerolling] = useState(false);
  const [allShownIds, setAllShownIds] = useState<string[]>(initialMatches.map(m => m.id));

  // Show more state - initially display 5 matches
  const INITIAL_DISPLAY_COUNT = 5;
  const [showAll, setShowAll] = useState(false);
  const visibleMatches = showAll ? matches : matches.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = matches.length > INITIAL_DISPLAY_COUNT;

  const isLove = category === 'love';

  /** Mask name for love matches: "Nguyen Van An" -> "N*** V*** A***" */
  const maskName = (member: Member): string => {
    const name = member.nickname || member.name || '';
    if (!name) return t.matches.anonymous;
    return name.split(/\s+/).map(part =>
      part.charAt(0) + '***'
    ).join(' ');
  };

  const genderLabel = (member: Member): string | null => {
    if (member.gender === 'Male') return '\u2642';
    if (member.gender === 'Female') return '\u2640';
    return null;
  };

  const handleReroll = async () => {
    setIsRerolling(true);
    setError(null);

    try {
      const response = await fetch('/api/request/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, exclude_ids: allShownIds }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      if (result.matches?.length > 0) {
        const newMatches = result.matches as MatchWithMember[];
        setMatches(newMatches);
        setAllShownIds(prev => [...prev, ...newMatches.map(m => m.id)]);
        setSelectedId(null);
        setCustomIntro('');
        setShowAll(false);
      } else {
        setError(t.matches.noMoreMatches);
      }

      if (result.quota) onQuotaUpdate?.(result.quota);
      if (result.warning) setError(result.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsRerolling(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedId) return;

    const match = matches.find(m => m.id === selectedId);
    if (!match) return;

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          selected_id: selectedId,
          match_reason: match.reason,
          custom_intro_text: customIntro || undefined,
          locale,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t.common.error);
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConnecting(false);
    }
  };

  const openModal = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    setSelectedId(match.id);

    // Generate pre-filled template
    const targetName = isLove ? maskName(match.member) : (match.member.nickname || match.member.name.split(' ')[0]);
    const requesterName = session?.user?.name?.split(' ')[0] || '';

    if (isLove) {
      setCustomIntro('');
    } else if (requesterClass) {
      setCustomIntro(interpolate(t.matches.matchIntroTemplate, { targetName, requesterName, requesterClass }));
    } else {
      setCustomIntro(interpolate(t.matches.matchIntroTemplateFallback, { targetName, requesterName }));
    }

    setShowModal(true);
  };

  const titleText = matches.length === 1
    ? interpolate(t.matches.title, { count: matches.length })
    : interpolate(t.matches.titlePlural, { count: matches.length });

  return (
    <div className="space-y-6">
      {/* Header + AI Credit Balance */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {titleText}
        </h2>
        <p className="text-text-secondary">
          {t.matches.selectPrompt}
        </p>

        {/* AI Credit Balance Badge */}
        {quota && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {interpolate(t.matches.creditRemaining, { remaining: quota.remaining, total: quota.total })}
            <span className="text-blue-500">
              ({quota.tier === 'premium' ? t.matches.creditPremium : t.matches.creditFree})
            </span>
          </div>
        )}

        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 mt-3 inline-block">
          {t.matches.aiDisclaimer}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {visibleMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => {
              setSelectedId(match.id);
            }}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedId === match.id
              ? isLove ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500' : 'border-brand bg-bg-surface ring-2 ring-brand'
              : 'border-border hover:border-brand-light'
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isLove && genderLabel(match.member) && (
                    <span className="text-lg" title={match.member.gender}>{genderLabel(match.member)}</span>
                  )}
                  <h3 className="font-semibold text-text-primary">
                    {isLove ? maskName(match.member) : match.member.name}
                  </h3>
                  {match.match_score != null && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {interpolate(t.matches.matchScore, { score: match.match_score })}
                    </span>
                  )}
                </div>
                {!isLove && (
                  <p className="text-sm text-text-secondary">
                    {interpolate(t.matches.roleAt, { role: match.member.role, company: match.member.company })}
                  </p>
                )}
              </div>
            </div>

            {isLove ? (
              <div className="mt-3 space-y-2 text-sm">
                {match.member.self_description && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">{t.matches.aboutLabel}</span> {match.member.self_description}</p>
                )}
                {match.member.interests && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">{t.matches.interestsLabel}</span> {match.member.interests}</p>
                )}
                {match.member.core_values && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">{t.matches.valuesLabel}</span> {match.member.core_values}</p>
                )}
                {match.member.ideal_day && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">{t.matches.idealDayLabel}</span> {match.member.ideal_day}</p>
                )}
                {match.member.qualities_looking_for && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">{t.matches.lookingForLabel}</span> {match.member.qualities_looking_for}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                {match.member.bio}
              </p>
            )}

            <div className="mt-3 p-3 bg-bg-primary rounded-lg">
              <p className="text-sm font-medium text-text-primary">{t.matches.whyMatched}</p>
              <p className="text-sm text-text-secondary mt-1">{match.reason}</p>
            </div>

            {!isLove && match.member.expertise && (
              <div className="mt-3 flex flex-wrap gap-2">
                {match.member.expertise.split(',').slice(0, 3).map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-bg-primary text-text-primary rounded-full"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(match.id);
                }}
                className={`w-full px-3 py-2 text-white text-sm font-medium rounded-md transition-colors ${isLove ? 'bg-pink-500 hover:bg-pink-600' : 'bg-brand hover:bg-brand-dark'
                  }`}
              >
                {isLove ? t.matches.sendLoveMatch : t.matches.requestIntro}
              </button>
            </div>
          </div>
        ))}

        {/* Show more / Show less toggle */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="w-full py-2.5 text-sm font-medium text-brand hover:text-brand-dark border border-border rounded-lg hover:bg-bg-surface transition-colors"
          >
            {showAll
              ? t.matches.showLess
              : interpolate(t.matches.showMore, { count: matches.length - INITIAL_DISPLAY_COUNT })}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReroll}
          disabled={isRerolling}
          className="w-full py-3.5 px-6 border-2 border-gray-300 text-gray-700 rounded-md font-medium hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isRerolling ? (
            <>
              <LoadingSpinner size="sm" />
              <span>{t.matches.refreshing}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t.matches.runAgain}</span>
            </>
          )}
        </button>
      </div>

      {onNewSearch && (
        <button
          onClick={onNewSearch}
          className="w-full py-3 px-6 text-text-secondary hover:text-brand hover:underline cursor-pointer text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{t.matches.startNewSearch}</span>
        </button>
      )}

      <p className="text-xs text-text-secondary text-center">
        {t.matches.rerollNote} {t.matches.footerNote}
      </p>

      {/* Modal matching ContactRequestModal layout */}
      {showModal && selectedId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {isLove
                ? t.matches.sendLoveMatch
                : interpolate(t.matches.requestIntro, { targetName: matches.find(m => m.id === selectedId)?.member?.name ?? '' })
              }
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {t.matches.modalNotice}
            </p>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                {t.matches.success.message}
              </div>
            ) : (
              <>
                <textarea
                  value={customIntro}
                  onChange={(e) => setCustomIntro(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={4}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${isLove ? 'focus:ring-pink-500' : 'focus:ring-blue-500'}`}
                  placeholder={t.matches.introPlaceholder}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{customIntro.length}/500</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mt-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    {t.matches.cancel}
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || (!isLove && !customIntro.trim())}
                    className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${isLove ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    {isConnecting ? t.matches.sending : t.matches.sendRequest}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
