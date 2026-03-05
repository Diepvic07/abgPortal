'use client';

import { useState } from 'react';
import { MatchResult, Member } from '@/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation, interpolate } from '@/lib/i18n';

interface MatchWithMember extends MatchResult {
  member: Member;
}

interface MatchResultsDisplayProps {
  matches: MatchWithMember[];
  requestId: string;
  category?: string;
  onNewSearch?: () => void;
}

export function MatchResultsDisplay({ matches: initialMatches, requestId, category, onNewSearch }: MatchResultsDisplayProps) {
  const { t, locale } = useTranslation();
  const [matches, setMatches] = useState<MatchWithMember[]>(initialMatches);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customIntro, setCustomIntro] = useState('');
  const [showIntroInput, setShowIntroInput] = useState(false);

  // Reroll state
  const [isRerolling, setIsRerolling] = useState(false);
  const [allShownIds, setAllShownIds] = useState<string[]>(initialMatches.map(m => m.id));

  // Show more state - initially display 5 matches
  const INITIAL_DISPLAY_COUNT = 5;
  const [showAll, setShowAll] = useState(false);
  const visibleMatches = showAll ? matches : matches.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = matches.length > INITIAL_DISPLAY_COUNT;

  const isLove = category === 'love';

  /** Mask name for love matches: "Nguyễn Văn An" → "N*** V*** A***" */
  const maskName = (member: Member): string => {
    const name = member.nickname || member.name || '';
    if (!name) return 'Anonymous';
    return name.split(/\s+/).map(part =>
      part.charAt(0) + '***'
    ).join(' ');
  };

  const genderLabel = (member: Member): string | null => {
    if (member.gender === 'Male') return '♂';
    if (member.gender === 'Female') return '♀';
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
        throw new Error(result.error || 'Failed to get new matches');
      }

      if (result.matches?.length > 0) {
        const newMatches = result.matches as MatchWithMember[];
        setMatches(newMatches);
        setAllShownIds(prev => [...prev, ...newMatches.map(m => m.id)]);
        setSelectedId(null);
        setShowIntroInput(false);
        setCustomIntro('');
        setShowAll(false);
      } else {
        setError('No more matches available. Try adjusting your request.');
      }

      if (result.warning) {
        setError(result.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reroll');
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

      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (connected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-success mb-4">
          {t.matches.success.title}
        </h2>
        <p className="text-text-secondary">
          {t.matches.success.message}
        </p>
      </div>
    );
  }

  const titleText = matches.length === 1
    ? interpolate(t.matches.title, { count: matches.length })
    : interpolate(t.matches.titlePlural, { count: matches.length });

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {titleText}
        </h2>
        <p className="text-text-secondary">
          {t.matches.selectPrompt}
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
              setShowIntroInput(false);
            }}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedId === match.id
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
                  {match.match_score && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {match.match_score}% match
                    </span>
                  )}
                </div>
                {!isLove && (
                  <p className="text-sm text-text-secondary">
                    {match.member.role} at {match.member.company}
                  </p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedId === match.id
                  ? isLove ? 'border-pink-500 bg-pink-500' : 'border-brand bg-brand'
                  : 'border-border'
              }`}>
                {selectedId === match.id && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>

            {isLove ? (
              <div className="mt-3 space-y-2 text-sm">
                {match.member.self_description && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">About:</span> {match.member.self_description}</p>
                )}
                {match.member.interests && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">Interests:</span> {match.member.interests}</p>
                )}
                {match.member.core_values && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">Values:</span> {match.member.core_values}</p>
                )}
                {match.member.ideal_day && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">Ideal day:</span> {match.member.ideal_day}</p>
                )}
                {match.member.qualities_looking_for && (
                  <p className="text-text-secondary"><span className="font-medium text-text-primary">Looking for:</span> {match.member.qualities_looking_for}</p>
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
              ? `Show less`
              : `Show ${matches.length - INITIAL_DISPLAY_COUNT} more matches`}
          </button>
        )}
      </div>

      {/* Custom Intro Section */}
      {selectedId && (
        <div className="space-y-3">
          {!showIntroInput ? (
            <button
              type="button"
              onClick={() => setShowIntroInput(true)}
              className="text-sm text-brand hover:text-brand-dark underline"
            >
              Add a personal introduction message (optional)
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Personal introduction (optional, max 500 chars)
              </label>
              <textarea
                value={customIntro}
                onChange={(e) => setCustomIntro(e.target.value.slice(0, 500))}
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand text-sm"
                placeholder="Write a personal message to introduce yourself..."
              />
              <p className="text-xs text-text-secondary text-right">{customIntro.length}/500</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleConnect}
          disabled={!selectedId || isConnecting}
          className={`flex-1 py-3.5 px-6 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
            isLove ? 'bg-pink-500 hover:bg-pink-600' : 'bg-brand hover:bg-brand-dark'
          }`}
        >
          {isConnecting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>{t.matches.sendingIntro}</span>
            </>
          ) : (
            isLove ? 'Send Love Match Request' : t.matches.requestIntro
          )}
        </button>

        <button
          onClick={handleReroll}
          disabled={isRerolling}
          className="py-3.5 px-6 border-2 border-gray-300 text-gray-700 rounded-md font-medium hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isRerolling ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Run Again</span>
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
          <span>Start a New Search</span>
        </button>
      )}

      <p className="text-xs text-text-secondary text-center">
        Rerolling counts against your request quota. {t.matches.footerNote}
      </p>
    </div>
  );
}
