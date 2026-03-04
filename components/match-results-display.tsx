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
}

export function MatchResultsDisplay({ matches: initialMatches, requestId, category }: MatchResultsDisplayProps) {
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

  const isLove = category === 'love';

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
        {matches.map((match) => (
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
                  <h3 className="font-semibold text-text-primary">
                    {match.member.name}
                  </h3>
                  {match.match_score && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {match.match_score}% match
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  {match.member.role} at {match.member.company}
                </p>
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

            <p className="mt-3 text-sm text-text-secondary">
              {match.member.bio}
            </p>

            <div className="mt-3 p-3 bg-bg-primary rounded-lg">
              <p className="text-sm font-medium text-text-primary">{t.matches.whyMatched}</p>
              <p className="text-sm text-text-secondary mt-1">{match.reason}</p>
            </div>

            {match.member.expertise && (
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

      <p className="text-xs text-text-secondary text-center">
        Rerolling counts against your request quota. {t.matches.footerNote}
      </p>
    </div>
  );
}
