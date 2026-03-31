'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, ProposalCategory, PROPOSAL_CATEGORY_LABELS, COMMITMENT_LABELS } from '@/types';

const CATEGORIES: ProposalCategory[] = ['charity', 'event', 'learning', 'community_support', 'other'];

const CATEGORY_ICONS: Record<ProposalCategory, string> = {
  charity: '❤️',
  event: '🎉',
  learning: '📚',
  community_support: '🤝',
  other: '💡',
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
            {CATEGORY_ICONS[cat]} {PROPOSAL_CATEGORY_LABELS[cat][locale === 'vi' ? 'vi' : 'en']}
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
          {proposals.map((proposal) => (
            <Link key={proposal.id} href={`/proposals/${proposal.id}`}>
              <div className={`bg-white rounded-xl border p-6 hover:shadow-md transition-shadow ${proposal.is_pinned ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}>
                {proposal.is_pinned && (
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full mb-2 inline-block">
                    📌 {locale === 'vi' ? 'Ghim' : 'Pinned'}
                  </span>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{CATEGORY_ICONS[proposal.category]}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
                      {proposal.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {locale === 'vi' ? 'bởi' : 'by'} {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{proposal.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-blue-600">
                    🔥 {proposal.commitment_score} {locale === 'vi' ? 'điểm' : 'pts'}
                  </span>
                  <span className="text-gray-500">
                    👥 {proposal.commitment_count} {locale === 'vi' ? 'người tham gia' : 'committed'}
                  </span>
                  {proposal.comment_count > 0 && (
                    <span className="text-gray-500">
                      💬 {proposal.comment_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
