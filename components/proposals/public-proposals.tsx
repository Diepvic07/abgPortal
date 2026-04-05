'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityProposal, PROPOSAL_CATEGORY_LABELS, COMMITMENT_LABELS } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  charity: '❤️', event: '🎉', learning: '📚', community_support: '🤝', other: '💡',
};

export function PublicProposals() {
  const { data: session, status } = useSession();
  const { locale } = useTranslation();
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    async function fetch_proposals() {
      try {
        const res = await fetch('/api/community/proposals/public');
        if (res.ok) {
          const data = await res.json();
          setProposals(data.proposals || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetch_proposals();
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {locale === 'vi' ? 'Hoạt động cộng đồng ABG' : 'What ABG Alumni Are Building Together'}
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {locale === 'vi'
              ? 'Đề xuất ý tưởng, cam kết tham gia, và cùng nhau xây dựng cộng đồng ABG.'
              : 'Our members don\'t just connect — they commit to action. See the ideas our community is bringing to life.'}
          </p>
          {isLoggedIn ? (
            <Link
              href="/proposals/new"
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
            >
              {locale === 'vi' ? '+ Đề xuất ý tưởng mới' : '+ Propose a New Idea'}
            </Link>
          ) : (
            <Link
              href="/signup"
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
            >
              {locale === 'vi' ? 'Tham gia ABG' : 'Join ABG to Participate'}
            </Link>
          )}
        </div>
      </div>

      {/* Proposals */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-48" />)}
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">New proposals coming soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {proposals.map((proposal) => (
              <Link key={proposal.id} href={`/proposals/${proposal.slug}`} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:-translate-y-0.5 block">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{CATEGORY_ICONS[proposal.category] || '💡'}</span>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {PROPOSAL_CATEGORY_LABELS[proposal.category]?.en || proposal.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">{proposal.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">{proposal.description}</p>
                <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-4">
                  <span className="font-semibold text-blue-600">🔥 {proposal.commitment_score} pts</span>
                  <span className="text-gray-500">👥 {proposal.commitment_count} committed</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  by {proposal.author_name || 'ABG Member'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-16 py-12 bg-gray-50 rounded-xl">
          {isLoggedIn ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {locale === 'vi' ? 'Bạn có ý tưởng?' : 'Got an Idea?'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                {locale === 'vi'
                  ? 'Đề xuất ý tưởng và cam kết cùng cộng đồng ABG thực hiện.'
                  : 'Propose your idea and commit together with the ABG community.'}
              </p>
              <Link
                href="/proposals/new"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
              >
                {locale === 'vi' ? '+ Đề xuất ý tưởng mới' : '+ Propose a New Idea'}
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {locale === 'vi' ? 'Sẵn sàng cùng xây dựng?' : 'Ready to Build Something Together?'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                {locale === 'vi'
                  ? 'Tham gia ABG Alumni Connect để đề xuất ý tưởng, cam kết tham gia, và cùng hành động.'
                  : 'Join ABG Alumni Connect to propose your own ideas, commit to initiatives, and be part of a community that acts.'}
              </p>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
              >
                {locale === 'vi' ? 'Tham gia ABG' : 'Join ABG to Participate'}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
