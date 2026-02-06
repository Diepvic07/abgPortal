'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface BlurredMatch {
  id: string;
  name: string;
  role: string;
  company: string;
  reason: string;
  blurred: boolean;
}

interface SearchResult {
  matches: BlurredMatch[];
  total: number;
  message: string;
}

export function PublicSearchSection() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/search/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResult = await res.json();
      setResult(data);
    } catch {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToAuth = () => {
    const authSection = document.getElementById('auth-section');
    authSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-gradient-to-b from-brand/5 to-transparent py-12 px-4 rounded-xl">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <SearchIcon />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          {t.landing.publicSearch.title}
        </h2>
        <p className="text-text-secondary mb-6">
          {t.landing.publicSearch.subtitle}
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.landing.publicSearch.placeholder}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            minLength={3}
          />
          <button
            type="submit"
            disabled={isLoading || query.trim().length < 3}
            className="px-6 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t.common.loading : t.landing.publicSearch.searchButton}
          </button>
        </form>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {result && (
          <div className="mt-6">
            {result.matches.length > 0 ? (
              <>
                <div className="grid gap-4 mb-6">
                  {result.matches.map((match) => (
                    <BlurredMatchCard key={match.id} match={match} />
                  ))}
                </div>
                <p className="text-text-secondary text-sm mb-4">
                  {result.message}
                </p>
                <button
                  onClick={scrollToAuth}
                  className="px-8 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition-colors"
                >
                  {t.landing.publicSearch.signInToSee}
                </button>
              </>
            ) : (
              <p className="text-text-secondary">{result.message}</p>
            )}
          </div>
        )}

        <p className="text-sm text-text-secondary mt-4">
          {t.landing.publicSearch.teaser}
        </p>
      </div>
    </section>
  );
}

function BlurredMatchCard({ match }: { match: BlurredMatch }) {
  return (
    <div className="bg-bg-surface p-4 rounded-lg shadow-md text-left relative overflow-hidden">
      {/* Blur overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-lg font-bold">?</span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text-primary blur-[2px] select-none">
            {match.name}
          </h4>
          <p className="text-sm text-text-secondary blur-[2px] select-none">
            {match.role} at {match.company}
          </p>
          <p className="text-sm text-brand mt-2 line-clamp-2">
            {match.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-12 h-12 text-brand mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
