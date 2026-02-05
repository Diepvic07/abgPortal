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
}

export function MatchResultsDisplay({ matches, requestId }: MatchResultsDisplayProps) {
  const { t, locale } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Build title with count
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
            onClick={() => setSelectedId(match.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedId === match.id
                ? 'border-brand bg-bg-surface ring-2 ring-brand'
                : 'border-border hover:border-brand-light'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">
                  {match.member.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {match.member.role} at {match.member.company}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedId === match.id
                  ? 'border-brand bg-brand'
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
          </div>
        ))}
      </div>

      <button
        onClick={handleConnect}
        disabled={!selectedId || isConnecting}
        className="w-full py-3.5 px-6 bg-brand text-white rounded-md font-medium hover:bg-brand-dark disabled:bg-brand/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <LoadingSpinner size="sm" />
            <span>{t.matches.sendingIntro}</span>
          </>
        ) : (
          t.matches.requestIntro
        )}
      </button>

      <p className="text-sm text-text-secondary text-center">
        {t.matches.footerNote}
      </p>
    </div>
  );
}
