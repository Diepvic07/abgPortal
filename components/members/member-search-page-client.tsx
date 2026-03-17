"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MemberSearchResultCard } from "./member-search-result-card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTranslation, interpolate } from "@/lib/i18n";
import type { SearchResultBasic, SearchResultPro } from "@/lib/search-utils";

type SearchResult = SearchResultBasic | SearchResultPro;

export function MemberSearchPageClient() {
  const { status } = useSession();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ name: "", company: "", expertise: "", abg_class: "" });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tier, setTier] = useState<string>("");
  const [abgClasses, setAbgClasses] = useState<string[]>([]);
  const [searchQuota, setSearchQuota] = useState<{ remaining: number | null; limit: number | null }>({ remaining: null, limit: null });
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/search/members").then(r => r.json()).then(d => {
        if (d.classes) setAbgClasses(d.classes);
        if (d.totalMembers != null) setTotalMembers(d.totalMembers);
        if (d.userClass) {
          setUserClass(d.userClass);
          setFilters(prev => ({ ...prev, abg_class: d.userClass }));
        } else {
          setUserClass(null);
        }
      }).catch(() => {});
    }
  }, [status]);

  // Auto-search when class filter changes
  useEffect(() => {
    if (filters.abg_class) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.abg_class]);

  const handleSearch = async () => {
    const hasQuery = query.trim().length >= 2;
    const hasFilters = Object.values(filters).some(v => v.trim().length > 0);
    if (!hasQuery && !hasFilters) {
      setError(t.members.searchMinQuery);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          filters: hasFilters ? Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v.trim().length > 0)
          ) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.members.searchFailed);
        if (res.status === 403) {
          setSearchQuota({ remaining: 0, limit: 10 });
        }
        return;
      }

      setResults(data.results || []);
      setTier(data.tier || "");
      if (data.search_quota) setSearchQuota(data.search_quota);
      setHasSearched(true);
    } catch {
      setError(t.members.searchFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t.members.signInRequired}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{t.members.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalMembers != null
                ? interpolate(t.members.totalMembers, { count: totalMembers })
                : t.members.subtitle}
            </p>
          </div>

          {/* Search + Filters */}
          <div className="px-6 py-4 space-y-4">
            {/* Main search bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.members.searchPlaceholder}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : t.members.searchButton}
              </button>
            </div>

            {/* Filter inputs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.members.filterName}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="text"
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.members.filterCompany}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                type="text"
                value={filters.expertise}
                onChange={(e) => setFilters({ ...filters, expertise: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.members.filterExpertise}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <select
                value={filters.abg_class}
                onChange={(e) => setFilters({ ...filters, abg_class: e.target.value })}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                <option value="">{t.members.filterAllClasses}</option>
                {abgClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Search quota for Basic tier */}
            {searchQuota.remaining !== null && (
              <div className={`text-xs px-3 py-1.5 rounded-md ${
                searchQuota.remaining === 0
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-blue-600"
              }`}>
                {searchQuota.remaining === 0
                  ? t.members.searchLimitReached
                  : t.members.searchesRemaining
                      .replace('{remaining}', String(searchQuota.remaining))
                      .replace('{limit}', String(searchQuota.limit))}
              </div>
            )}

            {/* Helper banner for basic tier / no-class users */}
            {status === "authenticated" && userClass !== undefined && (
              userClass ? (
                tier === "basic" || !tier ? (
                  <div className="text-xs px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    {t.members.basicClassHelper}
                  </div>
                ) : null
              ) : userClass === null && !hasSearched && !loading ? (
                <div className="text-xs px-3 py-2 rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                  {t.members.noClassFallback}
                </div>
              ) : null
            )}
          </div>

          {/* Results */}
          <div className="px-6 pb-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-12">
                <LoadingSpinner size="lg" text={t.common.loading} />
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <p className="text-lg font-medium">{t.members.noResults}</p>
                <p className="text-sm mt-1">{t.members.noResultsHint}</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  {results.length === 1
                    ? t.members.resultCount.replace('{count}', '1')
                    : t.members.resultCountPlural.replace('{count}', String(results.length))}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((result) => (
                    <MemberSearchResultCard
                      key={result.id}
                      result={result}
                      viewerTier={tier}
                    />
                  ))}
                </div>
              </div>
            ) : !hasSearched && !userClass ? (
              <div className="py-12 text-center text-gray-400">
                <p>{t.members.enterQuery}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
