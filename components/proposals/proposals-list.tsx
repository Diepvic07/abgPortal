'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, ProposalCategory, ProposalGenre, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS, PARTICIPATION_FORMAT_LABELS, ParticipationFormat, COMMITMENT_LABELS } from '@/types';

const CATEGORIES: ProposalCategory[] = ['talk', 'learning', 'fieldtrip', 'meeting', 'sports', 'community_support'];

const CATEGORY_COLORS: Record<ProposalCategory, { border: string; bg: string; accent: string }> = {
  talk: { border: 'border-l-indigo-400', bg: 'bg-indigo-50/40', accent: 'text-indigo-600' },
  learning: { border: 'border-l-blue-400', bg: 'bg-blue-50/40', accent: 'text-blue-600' },
  fieldtrip: { border: 'border-l-teal-400', bg: 'bg-teal-50/40', accent: 'text-teal-600' },
  meeting: { border: 'border-l-emerald-400', bg: 'bg-emerald-50/40', accent: 'text-emerald-600' },
  sports: { border: 'border-l-orange-400', bg: 'bg-orange-50/40', accent: 'text-orange-600' },
  community_support: { border: 'border-l-amber-400', bg: 'bg-amber-50/40', accent: 'text-amber-600' },
  charity: { border: 'border-l-rose-400', bg: 'bg-rose-50/40', accent: 'text-rose-600' },
  event: { border: 'border-l-purple-400', bg: 'bg-purple-50/40', accent: 'text-purple-600' },
  other: { border: 'border-l-violet-400', bg: 'bg-violet-50/40', accent: 'text-violet-600' },
};

export function ProposalsList() {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProposalCategory | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ member_name: string; total_score: number; proposals_led: number }>>([]);

  useEffect(() => {
    fetchProposals();
    fetchLeaderboard();
  }, [category]);

  async function fetchProposals() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const res = await fetch(`/api/community/proposals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeaderboard() {
    try {
      // Leaderboard is derived from public proposals for now
      // In a full implementation, this would be a separate endpoint
    } catch {}
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {locale === 'vi' ? 'Đề xuất cộng đồng' : 'Community Proposals'}
          </h1>
          <p className="text-gray-600 mt-1">
            {locale === 'vi' ? 'Đề xuất ý tưởng, cam kết tham gia, và cùng nhau xây dựng.' : 'Propose ideas, commit to action, and build together.'}
          </p>
        </div>
        <Link
          href={session ? "/proposals/new" : "/login"}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {locale === 'vi' ? '+ Đề xuất ý tưởng' : '+ Propose an Idea'}
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {locale === 'vi' ? 'Tất cả' : 'All'}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? null : cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {PROPOSAL_CATEGORY_LABELS[cat].icon} {PROPOSAL_CATEGORY_LABELS[cat][locale === 'vi' ? 'vi' : 'en']}
          </button>
        ))}
      </div>

      {/* Proposals Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-48" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-5xl mb-4">💡</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {locale === 'vi' ? 'Chưa có đề xuất nào' : 'No proposals yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {locale === 'vi' ? 'Hãy là người đầu tiên đề xuất ý tưởng!' : 'Be the first to propose an idea!'}
          </p>
          <Link
            href={session ? "/proposals/new" : "/login"}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {locale === 'vi' ? 'Đề xuất ngay' : 'Propose Now'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {proposals.map((proposal) => {
            const colors = CATEGORY_COLORS[proposal.category] || CATEGORY_COLORS.other;
            return (
              <Link key={proposal.id} href={`/proposals/${proposal.slug}`}>
                <div className={`rounded-xl border border-l-4 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${
                  proposal.is_pinned ? 'border-yellow-300 bg-yellow-50/20 border-l-yellow-400' : `border-gray-200 ${colors.border}`
                }`}>
                  {/* Card header with category accent */}
                  <div className={`px-5 pt-5 pb-3 ${proposal.is_pinned ? '' : colors.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {proposal.is_pinned && (
                          <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                            📌 {locale === 'vi' ? 'Ghim' : 'Pinned'}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {proposal.location && `${proposal.location} · `}
                          {PROPOSAL_CATEGORY_LABELS[proposal.category]?.icon} {PROPOSAL_CATEGORY_LABELS[proposal.category]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.category}
                        </span>
                      </div>
                      {proposal.participation_format && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          proposal.participation_format === 'online' ? 'bg-green-100 text-green-700' :
                          proposal.participation_format === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.participation_format}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
                      {proposal.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
                    </p>
                  </div>

                  {/* Tags */}
                  {proposal.tags && proposal.tags.length > 0 && (
                    <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                      {proposal.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="px-5 pb-3">
                    <p className="text-gray-600 text-sm line-clamp-2">{proposal.description}</p>
                  </div>

                  {/* Inline reactions footer — Facebook style */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="flex -space-x-1 text-sm">
                        <span>❤️</span><span>🙌</span><span>🚀</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-700 ml-1">{proposal.commitment_score}</span>
                      <span className="text-xs text-gray-500">· {proposal.commitment_count} {locale === 'vi' ? 'tham gia' : 'joined'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {proposal.comment_count > 0 && (
                        <span>💬 {proposal.comment_count}</span>
                      )}
                      {proposal.target_date && (
                        <span>📅 {proposal.target_date}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
