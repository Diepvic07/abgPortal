'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityEvent, CommunityProposal, EventCategory, EVENT_CATEGORY_LABELS, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS, PARTICIPATION_FORMAT_LABELS, ParticipationFormat, ProposalCategory, ProposalGenre } from '@/types';

type TabKey = 'events' | 'proposals' | 'past';

const EVENT_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  charity: { bg: 'bg-rose-50', text: 'text-rose-600' },
  event: { bg: 'bg-amber-50', text: 'text-amber-600' },
  learning: { bg: 'bg-blue-50', text: 'text-blue-600' },
  community_support: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  networking: { bg: 'bg-teal-50', text: 'text-teal-600' },
  other: { bg: 'bg-violet-50', text: 'text-violet-600' },
};

function getCategoryColor(category: string) {
  return EVENT_CATEGORY_COLORS[category] || EVENT_CATEGORY_COLORS.other;
}

function formatEventDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function EventsHub() {
  const { t, locale } = useTranslation();
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = !!session;
  const searchParams = useSearchParams();
  const validTabs = ['events', 'proposals', 'past'] as TabKey[];
  const initialTab = validTabs.includes(searchParams.get('tab') as TabKey)
    ? (searchParams.get('tab') as TabKey)
    : (isAuthenticated ? 'proposals' : 'events');
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [selectedProposals, setSelectedProposals] = useState<CommunityProposal[]>([]);
  const [pastEvents, setPastEvents] = useState<CommunityEvent[]>([]);
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until session status is resolved before fetching
    if (sessionStatus === 'loading') return;
    if (activeTab === 'events') fetchEvents();
    else if (activeTab === 'proposals') fetchProposals();
    else if (activeTab === 'past') fetchPastEvents();
  }, [activeTab, sessionStatus]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const eventsUrl = isAuthenticated
        ? '/api/community/events?upcoming=true'
        : '/api/public/events?upcoming=true';
      // Also fetch "selected" proposals — these are approved to become events
      const [eventsRes, proposalsRes] = await Promise.all([
        fetch(eventsUrl),
        fetch('/api/community/proposals?status=selected'),
      ]);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        // Only show selected proposals with a future target_date in upcoming tab
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const upcoming = (data.proposals || []).filter((p: CommunityProposal) =>
          p.target_date && new Date(p.target_date) >= now
        );
        setSelectedProposals(upcoming);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPastEvents() {
    setLoading(true);
    try {
      const url = isAuthenticated
        ? '/api/community/events?past=true'
        : '/api/public/events?past=true';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPastEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch past events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProposals() {
    setLoading(true);
    try {
      const url = isAuthenticated
        ? '/api/community/proposals'
        : '/api/community/proposals/public';
      const res = await fetch(url);
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

  const allTabs: { key: TabKey; label: { en: string; vi: string }; authOnly?: boolean }[] = [
    { key: 'events', label: { en: 'Official Activities', vi: 'Hoạt động chính thức' } },
    { key: 'proposals', label: { en: 'Proposals', vi: 'Đề xuất' } },
    { key: 'past', label: { en: 'Past Activities', vi: 'Hoạt động đã qua' } },
  ];
  const tabs = allTabs;

  return (
    <div>
      {/* Header with tabs and CTA */}
      <div className="flex items-center justify-between mb-2">
        <nav className="flex gap-6" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label[locale === 'vi' ? 'vi' : 'en']}
            </button>
          ))}
        </nav>
        <Link
          href={isAuthenticated ? '/proposals/new' : '/login'}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {locale === 'vi' ? '+ Đề xuất ý tưởng' : '+ Propose an Idea'}
        </Link>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'events' && (
          <EventsTabContent events={events} selectedProposals={selectedProposals} loading={loading} locale={locale} session={session} />
        )}
        {activeTab === 'proposals' && (
          <ProposalsTabContent proposals={proposals} loading={loading} locale={locale} session={session} />
        )}
        {activeTab === 'past' && (
          <PastEventsTabContent events={pastEvents} loading={loading} locale={locale} />
        )}
      </div>
    </div>
  );
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="py-4 animate-pulse">
          <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-50 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message, cta, href }: { message: string; cta?: string; href?: string }) {
  return (
    <div className="text-center py-16 bg-gray-50 rounded-xl">
      <p className="text-gray-600 mb-4">{message}</p>
      {cta && href && (
        <Link
          href={href}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

function EventsTabContent({
  events,
  selectedProposals,
  loading,
  locale,
  session,
}: {
  events: CommunityEvent[];
  selectedProposals: CommunityProposal[];
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
}) {
  const isAuthenticated = !!session;
  if (loading) return <SkeletonRows />;

  const hasContent = events.length > 0 || selectedProposals.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Chưa có hoạt động sắp tới. Hãy đề xuất một hoạt động!' : 'No upcoming activities. Propose one!'}
        cta={locale === 'vi' ? 'Đề xuất ngay' : 'Propose Now'}
        href={isAuthenticated ? '/proposals/new' : '/login'}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'HOẠT ĐỘNG SẮP TỚI' : 'UPCOMING ACTIVITIES'}
      </h2>
      <div className="divide-y divide-gray-100">
        {selectedProposals.map((proposal) => (
          <SelectedProposalRow key={proposal.id} proposal={proposal} locale={locale} isAuthenticated={isAuthenticated} />
        ))}
        {events.map((event) => (
          <EventRow key={event.id} event={event} locale={locale} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </div>
  );
}

function ProposalsTabContent({
  proposals,
  loading,
  locale,
  session,
}: {
  proposals: CommunityProposal[];
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
}) {
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  if (loading) return <SkeletonRows />;

  if (proposals.length === 0) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Chưa có đề xuất nào. Hãy là người đầu tiên!' : 'No proposals yet. Be the first!'}
        cta={locale === 'vi' ? '+ Đề xuất ý tưởng' : '+ Propose an Idea'}
        href={session ? '/proposals/new' : '/login'}
      />
    );
  }

  // Collect genres that have proposals, sorted by count (other last)
  const genreCounts = new Map<string, number>();
  for (const p of proposals) {
    const g = p.genre || 'other';
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  }
  const genres = Array.from(genreCounts.keys()).sort((a, b) => {
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    return (genreCounts.get(b) || 0) - (genreCounts.get(a) || 0);
  });

  // Sort by activity: pinned first, then by engagement (participants + comments)
  const sorted = [...proposals].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const activityA = (a.commitment_count || 0) + (a.comment_count || 0);
    const activityB = (b.commitment_count || 0) + (b.comment_count || 0);
    return activityB - activityA;
  });

  const filtered = activeGenre
    ? sorted.filter(p => (p.genre || 'other') === activeGenre)
    : sorted;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {locale === 'vi' ? 'ĐỀ XUẤT CỘNG ĐỒNG' : 'COMMUNITY PROPOSALS'}
      </h2>

      {/* Genre filter tabs */}
      <div className="relative mb-4">
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden" />
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide snap-x snap-mandatory">
          <button
            onClick={() => setActiveGenre(null)}
            className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeGenre === null
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {locale === 'vi' ? 'Tất cả' : 'All'}
          </button>
          {genres.map((genre) => {
            const genreInfo = PROPOSAL_GENRE_LABELS[genre as ProposalGenre] || PROPOSAL_GENRE_LABELS.other;
            return (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeGenre === genre
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {genreInfo.icon} {genreInfo[locale === 'vi' ? 'vi' : 'en']}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered proposals list */}
      <div className="divide-y divide-gray-100">
        {filtered.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} locale={locale} isAuthenticated={!!session} />
        ))}
      </div>
    </div>
  );
}

function PastEventsTabContent({
  events,
  loading,
  locale,
}: {
  events: CommunityEvent[];
  loading: boolean;
  locale: string;
}) {
  if (loading) return <SkeletonRows />;

  if (events.length === 0) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Chưa có hoạt động đã qua.' : 'No past activities yet.'}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'HOẠT ĐỘNG ĐÃ QUA' : 'PAST ACTIVITIES'}
      </h2>
      <div className="divide-y divide-gray-100">
        {events.map((event) => (
          <PastEventRow key={event.id} event={event} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, locale, isAuthenticated }: { event: CommunityEvent; locale: string; isAuthenticated?: boolean }) {
  const colors = getCategoryColor(event.category);
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[locale === 'vi' ? 'vi' : 'en'] || event.category;
  const totalJoined = event.rsvp_count + (event.guest_rsvp_count || 0);
  const hasGuestSlots = event.is_public && event.capacity_guest != null && event.capacity_guest > 0;
  const guestSlotsLeft = hasGuestSlots ? Math.max(0, event.capacity_guest! - (event.guest_rsvp_count || 0)) : 0;

  return (
    <Link href={`/events/${event.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">{event.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {event.author_name || 'Admin'} · {formatEventDate(event.event_date, locale)}
          </p>
        </div>
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {totalJoined}
          </span>
          {!isAuthenticated && hasGuestSlots && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${guestSlotsLeft > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {guestSlotsLeft > 0
                ? (locale === 'vi' ? `${guestSlotsLeft} chỗ khách` : `${guestSlotsLeft} guest spots`)
                : (locale === 'vi' ? 'Hết chỗ khách' : 'Guest full')}
            </span>
          )}
          {isAuthenticated && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              {event.comment_count}
            </span>
          )}
          {event.is_public && !isAuthenticated && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
              {locale === 'vi' ? 'Công khai' : 'Public'}
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProposalRow({ proposal, locale, isAuthenticated }: { proposal: CommunityProposal; locale: string; isAuthenticated?: boolean }) {
  const categoryColors: Record<string, { bg: string; text: string }> = {
    charity: { bg: 'bg-rose-50', text: 'text-rose-600' },
    event: { bg: 'bg-amber-50', text: 'text-amber-600' },
    learning: { bg: 'bg-blue-50', text: 'text-blue-600' },
    community_support: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    other: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };
  const colors = categoryColors[proposal.category] || categoryColors.other;
  const categoryLabel = PROPOSAL_CATEGORY_LABELS[proposal.category]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.category;

  return (
    <Link href={`/proposals/${proposal.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">{proposal.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
            {proposal.location && <span> · 📍 {proposal.location}</span>}
            {proposal.participation_format && (
              <span> · {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.icon} {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.participation_format}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {proposal.commitment_count}
          </span>
          {isAuthenticated && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              {proposal.comment_count}
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SelectedProposalRow({ proposal, locale, isAuthenticated }: { proposal: CommunityProposal; locale: string; isAuthenticated?: boolean }) {
  const categoryColors: Record<string, { bg: string; text: string }> = {
    charity: { bg: 'bg-rose-50', text: 'text-rose-600' },
    event: { bg: 'bg-amber-50', text: 'text-amber-600' },
    learning: { bg: 'bg-blue-50', text: 'text-blue-600' },
    community_support: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    other: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };
  const colors = categoryColors[proposal.category] || categoryColors.other;
  const categoryLabel = PROPOSAL_CATEGORY_LABELS[proposal.category]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.category;

  return (
    <Link href={`/proposals/${proposal.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-base truncate">{proposal.title}</h3>
            <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              {locale === 'vi' ? 'Đã chọn' : 'Selected'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
            {proposal.target_date && ` · ${formatEventDate(proposal.target_date, locale)}`}
            {proposal.location && <span> · 📍 {proposal.location}</span>}
            {proposal.participation_format && (
              <span> · {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.icon} {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.[locale === 'vi' ? 'vi' : 'en'] || proposal.participation_format}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {proposal.commitment_count}
          </span>
          {isAuthenticated && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              {proposal.comment_count}
            </span>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PastEventRow({ event, locale }: { event: CommunityEvent; locale: string }) {
  const colors = getCategoryColor(event.category);
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[locale === 'vi' ? 'vi' : 'en'] || event.category;

  // Count actual attendees from rsvp_count (in completed state, this is still total RSVPs)
  return (
    <Link href={`/events/${event.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">{event.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatEventDate(event.event_date, locale)}
            {event.rsvp_count > 0 && (
              <span> · {event.rsvp_count} {locale === 'vi' ? 'tham dự' : 'attended'}</span>
            )}
          </p>
          {event.outcome_summary && (
            <p className="text-sm text-gray-600 mt-1 truncate">{event.outcome_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600`}>
            {locale === 'vi' ? 'Hoàn thành' : 'Completed'}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
