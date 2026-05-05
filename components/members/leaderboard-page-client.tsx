"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type PeriodType = "month" | "quarter" | "year";

interface RankingEntry {
  rank: number;
  member: {
    id: string;
    name: string;
    avatar_url?: string;
    abg_class?: string;
    public_profile_slug?: string;
  };
  total_score: number;
  participation_score: number;
  engagement_score: number;
  breakdown: {
    events: number;
    proposals: number;
    references: number;
    connections: number;
    comments: number;
  };
  last_scored_at?: string;
}

interface LeaderboardData {
  period: {
    type: string;
    label: string;
    start: string;
    end: string;
    timezone: string;
  };
  rankings: RankingEntry[];
  current_member: RankingEntry | null;
  available_periods: Array<{
    label: string;
    anchor: string;
    start: string;
    end: string;
  }>;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export function LeaderboardPageClient() {
  const { data: session, status: authStatus } = useSession();
  const [period, setPeriod] = useState<PeriodType>("month");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (periodType: PeriodType, anchorDate: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period: periodType });
      if (anchorDate) params.set("anchor", anchorDate);

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load leaderboard");
        return;
      }
      setData(json);
    } catch {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchLeaderboard(period, anchor);
    }
  }, [authStatus, period, anchor, fetchLeaderboard]);

  const switchPeriod = (nextPeriod: PeriodType) => {
    setPeriod(nextPeriod);
    setAnchor(null);
  };

  const selectedAnchor = anchor ?? data?.period.start.slice(0, 10) ?? "";
  const hasCurrentPeriodOption = !!data?.available_periods.some((option) => option.anchor === selectedAnchor);

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Rankings based on real participation and community engagement
        </p>
      </div>

      {/* Period Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(["month", "quarter", "year"] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => switchPeriod(p)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Period Picker */}
      {data?.period && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <p className="text-sm text-gray-500 font-medium">
            {data.period.label}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="leaderboard-period-anchor" className="text-xs font-medium text-gray-500">
              View
            </label>
            <select
              id="leaderboard-period-anchor"
              value={selectedAnchor}
              onChange={(event) => setAnchor(event.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {!hasCurrentPeriodOption && (
                <option value={selectedAnchor}>{data.period.label}</option>
              )}
              {data.available_periods.map((option) => (
                <option key={option.start} value={option.anchor}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data && data.rankings.length === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-xl bg-white">
          <p className="text-gray-500 text-sm">
            No scores recorded for this period yet
          </p>
        </div>
      )}

      {/* Rankings */}
      {!loading && !error && data && data.rankings.length > 0 && (
        <div className="space-y-2">
          {data.rankings.map((entry) => (
            <RankingRow
              key={entry.member.id}
              entry={entry}
              isCurrentUser={entry.member.id === (session?.user as Record<string, unknown>)?.memberId}
            />
          ))}
        </div>
      )}

      {/* Current Member (if not in top list) */}
      {!loading && !error && data?.current_member && (
        <div className="mt-6">
          <p className="text-xs text-gray-400 uppercase font-medium mb-2">
            Your Ranking
          </p>
          <RankingRow
            entry={data.current_member}
            isCurrentUser={true}
          />
        </div>
      )}
    </div>
  );
}

function RankingRow({ entry, isCurrentUser }: { entry: RankingEntry; isCurrentUser: boolean }) {
  const profileUrl = entry.member.public_profile_slug
    ? `/profile/${entry.member.public_profile_slug}`
    : undefined;

  const content = (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isCurrentUser
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {entry.rank <= 3 ? (
          <span className="text-lg">
            {entry.rank === 1 ? "\u{1F947}" : entry.rank === 2 ? "\u{1F948}" : "\u{1F949}"}
          </span>
        ) : (
          <span className="text-sm font-semibold text-gray-400">
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <MemberAvatar
        name={entry.member.name}
        avatarUrl={entry.member.avatar_url}
        size="sm"
      />

      {/* Name & Class */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {entry.member.name}
        </p>
        {entry.member.abg_class && (
          <p className="text-xs text-gray-400">{entry.member.abg_class}</p>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-400">
            P: {entry.participation_score}
          </p>
          <p className="text-xs text-gray-400">
            E: {entry.engagement_score}
          </p>
        </div>
        <div className="w-12 text-right">
          <p className="text-lg font-bold text-gray-900">
            {entry.total_score}
          </p>
        </div>
      </div>
    </div>
  );

  if (profileUrl) {
    return <Link href={profileUrl}>{content}</Link>;
  }

  return content;
}
