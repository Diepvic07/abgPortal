'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MatchResult, Member } from '@/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation, interpolate } from '@/lib/i18n';
import { MatchResultCard } from '@/components/match-result-card';
import { MatchIntroModal } from '@/components/match-intro-modal';

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
  const { data: session } = useSession();
  const [matches, setMatches] = useState<MatchWithMember[]>(initialMatches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customIntro, setCustomIntro] = useState('');
  const [requesterClass, setRequesterClass] = useState('');
  const [isRerolling, setIsRerolling] = useState(false);
  const [allShownIds, setAllShownIds] = useState<string[]>(initialMatches.map(m => m.id));

  const INITIAL_DISPLAY_COUNT = 5;
  const [showAll, setShowAll] = useState(false);
  const visibleMatches = showAll ? matches : matches.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = matches.length > INITIAL_DISPLAY_COUNT;
  const isLove = category === 'love';

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profile').then(r => r.json()).then(d => {
        if (d.member?.abg_class) setRequesterClass(d.member.abg_class);
      }).catch(console.error);
    }
  }, [session]);

  const handleReroll = async () => {
    setIsRerolling(true);
    setError(null);
    try {
      const res = await fetch('/api/request/reroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, exclude_ids: allShownIds }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.common.error);
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
      const res = await fetch('/api/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId, selected_id: selectedId,
          match_reason: match.reason, custom_intro_text: customIntro || undefined, locale,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.common.error);
      setSuccess(true);
      setTimeout(() => { setShowModal(false); setSuccess(false); }, 1500);
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
    const targetName = isLove ? '' : (match.member.nickname || match.member.name.split(' ')[0]);
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

  const selectedMatch = matches.find(m => m.id === selectedId);
  const modalTargetName = selectedMatch
    ? (isLove ? '' : (selectedMatch.member.nickname || selectedMatch.member.name.split(' ')[0]))
    : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          {titleText}
        </div>

        <p className="text-sm text-gray-500">{t.matches.selectPrompt}</p>

        {/* Credit badge */}
        {quota && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 shadow-sm">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
            </svg>
            {interpolate(t.matches.creditRemaining, { remaining: quota.remaining, total: quota.total })}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${quota.tier === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {quota.tier === 'premium' ? t.matches.creditPremium : t.matches.creditFree}
            </span>
          </div>
        )}

        {/* AI disclaimer */}
        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
          {t.matches.aiDisclaimer}
        </p>
      </div>

      {/* Error */}
      {error && !showModal && (
        <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-3">
        {visibleMatches.map((match) => (
          <MatchResultCard
            key={match.id}
            match={match}
            isSelected={selectedId === match.id}
            isLove={isLove}
            onSelect={setSelectedId}
            onRequestIntro={openModal}
          />
        ))}

        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="w-full py-2.5 text-sm font-medium text-brand hover:text-brand-light border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {showAll ? t.matches.showLess : interpolate(t.matches.showMore, { count: matches.length - INITIAL_DISPLAY_COUNT })}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleReroll}
          disabled={isRerolling}
          className="w-full py-3 px-6 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {isRerolling ? (
            <><LoadingSpinner size="sm" /><span>{t.matches.refreshing}</span></>
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
          className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {t.matches.startNewSearch}
        </button>
      )}

      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        {t.matches.rerollNote} {t.matches.footerNote}
      </p>

      {/* Modal */}
      {showModal && selectedId && (
        <MatchIntroModal
          isLove={isLove}
          targetName={modalTargetName}
          requesterName={session?.user?.name?.split(' ')[0] || ''}
          requesterClass={requesterClass}
          customIntro={customIntro}
          onCustomIntroChange={setCustomIntro}
          isConnecting={isConnecting}
          error={error}
          success={success}
          onSend={handleConnect}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
