'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityEvent, CommunityProposal, EventCategory, EVENT_CATEGORY_LABELS, PROPOSAL_CATEGORY_LABELS, ProposalCategory } from '@/types';

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
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>('events');
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<CommunityEvent[]>([]);
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'events') fetchEvents();
    else if (activeTab === 'proposals') fetchProposals();
    else if (activeTab === 'past') fetchPastEvents();
  }, [activeTab]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/community/events?upcoming=true');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
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
      const res = await fetch('/api/community/events?past=true');
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
      const res = await fetch('/api/community/proposals');
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

  const tabs: { key: TabKey; label: { en: string; vi: string } }[] = [
    { key: 'events', label: { en: 'Events', vi: 'Sự kiện' } },
    { key: 'proposals', label: { en: 'Proposals', vi: 'Đề xuất' } },
    { key: 'past', label: { en: 'Past Events', vi: 'Sự kiện đã qua' } },
  ];

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
          href={session ? '/proposals/new' : '/login'}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {locale === 'vi' ? '+ Đề xuất ý tưởng' : '+ Propose an Idea'}
        </Link>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'events' && (
          <EventsTabContent events={events} loading={loading} locale={locale} session={session} />
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
  loading,
  locale,
  session,
}: {
  events: CommunityEvent[];
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
}) {
  if (loading) return <SkeletonRows />;

  if (events.length === 0) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Chưa có sự kiện sắp tới. Hãy đề xuất một hoạt động!' : 'No upcoming events. Propose an activity!'}
        cta={locale === 'vi' ? 'Đề xuất ngay' : 'Propose Now'}
        href={session ? '/proposals/new' : '/login'}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'SỰ KIỆN SẮP TỚI' : 'UPCOMING EVENTS'}
      </h2>
      <div className="divide-y divide-gray-100">
        {events.map((event) => (
          <EventRow key={event.id} event={event} locale={locale} />
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

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'ĐỀ XUẤT CỘNG ĐỒNG' : 'COMMUNITY PROPOSALS'}
      </h2>
      <div className="divide-y divide-gray-100">
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} locale={locale} />
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
        message={locale === 'vi' ? 'Chưa có sự kiện đã qua.' : 'No past events yet.'}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'SỰ KIỆN ĐÃ QUA' : 'PAST EVENTS'}
      </h2>
      <div className="divide-y divide-gray-100">
        {events.map((event) => (
          <PastEventRow key={event.id} event={event} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, locale }: { event: CommunityEvent; locale: string }) {
  const colors = getCategoryColor(event.category);
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[locale === 'vi' ? 'vi' : 'en'] || event.category;

  return (
    <Link href={`/events/${event.id}`} className="block">
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
            {event.rsvp_count}
          </span>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            {event.comment_count}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProposalRow({ proposal, locale }: { proposal: CommunityProposal; locale: string }) {
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
    <Link href={`/proposals/${proposal.id}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">{proposal.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {proposal.commitment_count}
          </span>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            {proposal.comment_count}
          </span>
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
    <Link href={`/events/${event.id}`} className="block">
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
