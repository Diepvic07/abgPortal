'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityEvent, CommunityProposal, EventCategory, EVENT_CATEGORY_LABELS, LibraryItem, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS, PARTICIPATION_FORMAT_LABELS, ParticipationFormat, ProposalCategory, ProposalGenre } from '@/types';

type TabKey = 'events' | 'proposals' | 'projects' | 'library';
type EventsView = 'upcoming' | 'past';

type ProposalsFilter = 'active' | 'completed' | 'archived';
type ProjectsFilter = 'project_active' | 'project_completed' | 'project_discontinued' | 'project_closed';
type ProposalsSort = 'active' | 'newest' | 'participants' | 'soonest';

function timeAgo(dateStr: string, vi: boolean): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  // Beyond 30 days, render an absolute date so old proposals don't drown
  // their context behind "5 tháng trước".
  if (day > 30) {
    try {
      return new Date(dateStr).toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
  if (vi) {
    if (week > 0) return `${week} tuần trước`;
    if (day > 0) return `${day} ngày trước`;
    if (hr > 0) return `${hr} giờ trước`;
    if (min > 0) return `${min} phút trước`;
    return 'vừa xong';
  }
  if (week > 0) return `${week}w ago`;
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return 'just now';
}

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
  const validTabs = ['events', 'proposals', 'projects', 'library'] as TabKey[];
  const tabParam = searchParams.get('tab');
  // Legacy ?tab=past links land on Hoạt động chính thức with the past view.
  const initialTab: TabKey = tabParam === 'past'
    ? 'events'
    : validTabs.includes(tabParam as TabKey)
      ? (tabParam as TabKey)
      : (isAuthenticated ? 'proposals' : 'events');
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [eventsView, setEventsView] = useState<EventsView>(tabParam === 'past' ? 'past' : 'upcoming');
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<CommunityEvent[]>([]);
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [proposalsFilter, setProposalsFilter] = useState<ProposalsFilter>('active');
  const [proposalsSort, setProposalsSort] = useState<ProposalsSort>('active');
  const [upcomingProposals, setUpcomingProposals] = useState<CommunityProposal[]>([]);
  const [projects, setProjects] = useState<CommunityProposal[]>([]);
  const [projectsFilter, setProjectsFilter] = useState<ProjectsFilter>('project_active');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [canWatchLibrary, setCanWatchLibrary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until session status is resolved before fetching
    if (sessionStatus === 'loading') return;
    if (activeTab === 'events') {
      if (eventsView === 'past') fetchPastEvents();
      else fetchEvents();
    }
    else if (activeTab === 'proposals') fetchProposals(proposalsFilter, proposalsSort);
    else if (activeTab === 'projects') fetchProjects(projectsFilter);
    else if (activeTab === 'library') fetchLibrary();
  }, [activeTab, eventsView, sessionStatus, proposalsFilter, proposalsSort, projectsFilter]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const eventsUrl = isAuthenticated
        ? '/api/community/events?upcoming=true'
        : '/api/public/events?upcoming=true';
      // Run in parallel: admin-created events + upcoming proposals (those
      // with status='upcoming', sorted soonest first). Both share this tab
      // and are merged by date in EventsTabContent.
      const [eventsRes, upcomingRes] = await Promise.all([
        fetch(eventsUrl),
        fetch('/api/community/proposals?status=upcoming&sort=soonest&limit=100'),
      ]);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcomingProposals(data.proposals || []);
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

  async function fetchProposals(filter: ProposalsFilter, sort: ProposalsSort) {
    setLoading(true);
    try {
      // 'active' filter → API default (published + upcoming) + chosen sort.
      // Completed / archived → server-side single-status + always 'newest'
      // (sort dropdown is hidden in those buckets, see ProposalsTabContent).
      const params = new URLSearchParams({ limit: '100' });
      if (filter === 'active') {
        params.set('sort', sort);
      } else {
        params.set('status', filter);
        params.set('sort', 'newest');
      }
      const res = await fetch(`/api/community/proposals?${params.toString()}`);
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

  async function fetchProjects(filter: ProjectsFilter) {
    setLoading(true);
    try {
      const url = `/api/community/proposals?limit=100&status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLibrary() {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        setLibraryItems([]);
        setCanWatchLibrary(false);
        return;
      }

      const res = await fetch('/api/library');
      if (res.ok) {
        const data = await res.json();
        setLibraryItems(data.library_items || []);
        setCanWatchLibrary(!!data.can_watch);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    } finally {
      setLoading(false);
    }
  }

  const allTabs: { key: TabKey; label: { en: string; vi: string }; authOnly?: boolean }[] = [
    { key: 'events', label: { en: 'Official Activities', vi: 'Hoạt động chính thức' } },
    { key: 'proposals', label: { en: 'Proposals', vi: 'Đề xuất' } },
    { key: 'projects', label: { en: 'Active Projects', vi: 'Dự án đang triển khai' } },
    { key: 'library', label: { en: 'Library', vi: 'Thư viện' } },
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
          <EventsTabContent
            events={events}
            pastEvents={pastEvents}
            upcomingProposals={upcomingProposals}
            loading={loading}
            locale={locale}
            session={session}
            view={eventsView}
            onViewChange={setEventsView}
          />
        )}
        {activeTab === 'proposals' && (
          <ProposalsTabContent
            proposals={proposals}
            loading={loading}
            locale={locale}
            session={session}
            filter={proposalsFilter}
            onFilterChange={(f) => {
              setProposalsFilter(f);
              // Switching away from 'active' implies "newest" semantics; reset.
              if (f !== 'active' && proposalsSort !== 'active') setProposalsSort('active');
            }}
            sort={proposalsSort}
            onSortChange={setProposalsSort}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsTabContent
            projects={projects}
            loading={loading}
            locale={locale}
            filter={projectsFilter}
            onFilterChange={setProjectsFilter}
          />
        )}
        {activeTab === 'library' && (
          <LibraryTabContent items={libraryItems} canWatch={canWatchLibrary} loading={loading} locale={locale} session={session} />
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
  pastEvents,
  upcomingProposals,
  loading,
  locale,
  session,
  view,
  onViewChange,
}: {
  events: CommunityEvent[];
  pastEvents: CommunityEvent[];
  upcomingProposals: CommunityProposal[];
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
  view: EventsView;
  onViewChange: (v: EventsView) => void;
}) {
  const vi = locale === 'vi';
  const isAuthenticated = !!session;

  const viewChips: { key: EventsView; label: string }[] = [
    { key: 'upcoming', label: vi ? 'Sắp diễn ra' : 'Upcoming' },
    { key: 'past', label: vi ? 'Đã qua' : 'Past' },
  ];
  const viewDescriptions: Record<EventsView, string> = {
    upcoming: vi
      ? 'Sự kiện do BTC tổ chức và đề xuất đã có lịch họp sắp diễn ra.'
      : 'Admin-organized events and proposals with an upcoming meeting.',
    past: vi
      ? 'Các sự kiện đã kết thúc.'
      : 'Events that have already happened.',
  };

  const viewToggle = (
    <>
      <div className="flex gap-2 mb-2 flex-wrap">
        {viewChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => onViewChange(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              view === chip.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 italic mb-4">{viewDescriptions[view]}</p>
    </>
  );

  // ---- Past view ----
  if (view === 'past') {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'HOẠT ĐỘNG ĐÃ QUA' : 'PAST ACTIVITIES'}
        </h2>
        {viewToggle}
        {loading ? (
          <SkeletonRows />
        ) : pastEvents.length === 0 ? (
          <EmptyState message={vi ? 'Chưa có hoạt động đã qua.' : 'No past activities yet.'} />
        ) : (
          <div className="divide-y divide-gray-100">
            {pastEvents.map((event) => (
              <PastEventRow key={event.id} event={event} locale={locale} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Upcoming view (default) ----
  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'HOẠT ĐỘNG SẮP DIỄN RA' : 'UPCOMING ACTIVITIES'}
        </h2>
        {viewToggle}
        <SkeletonRows />
      </div>
    );
  }

  if (events.length === 0 && upcomingProposals.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'HOẠT ĐỘNG SẮP DIỄN RA' : 'UPCOMING ACTIVITIES'}
        </h2>
        {viewToggle}
        <EmptyState
          message={vi ? 'Chưa có hoạt động sắp tới. Hãy đề xuất một hoạt động!' : 'No upcoming activities. Propose one!'}
          cta={vi ? 'Đề xuất ngay' : 'Propose Now'}
          href={isAuthenticated ? '/proposals/new' : '/login'}
        />
      </div>
    );
  }

  // Merge events and upcoming proposals on a single date axis. Same-day ties
  // → events first (they're admin-confirmed, higher signal).
  type MergedItem =
    | { kind: 'event'; date: number; event: CommunityEvent }
    | { kind: 'proposal'; date: number; proposal: CommunityProposal };
  const merged: MergedItem[] = [
    ...events.map((event) => ({
      kind: 'event' as const,
      date: event.event_date ? new Date(event.event_date).getTime() : Number.POSITIVE_INFINITY,
      event,
    })),
    ...upcomingProposals.map((proposal) => ({
      kind: 'proposal' as const,
      date: proposal.next_event_date ? new Date(proposal.next_event_date).getTime() : Number.POSITIVE_INFINITY,
      proposal,
    })),
  ];
  merged.sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    if (a.kind !== b.kind) return a.kind === 'event' ? -1 : 1;
    return 0;
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {vi ? 'HOẠT ĐỘNG SẮP DIỄN RA' : 'UPCOMING ACTIVITIES'}
      </h2>
      {viewToggle}
      <div className="divide-y divide-gray-100">
        {merged.map((item) =>
          item.kind === 'event' ? (
            <EventRow key={`e-${item.event.id}`} event={item.event} locale={locale} isAuthenticated={isAuthenticated} />
          ) : (
            <ProposalRow
              key={`p-${item.proposal.id}`}
              proposal={item.proposal}
              locale={locale}
              isAuthenticated={isAuthenticated}
              showUpcomingBadge
            />
          ),
        )}
      </div>
    </div>
  );
}

function ProposalsTabContent({
  proposals,
  loading,
  locale,
  session,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: {
  proposals: CommunityProposal[];
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
  filter: ProposalsFilter;
  onFilterChange: (f: ProposalsFilter) => void;
  sort: ProposalsSort;
  onSortChange: (s: ProposalsSort) => void;
}) {
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const vi = locale === 'vi';
  const statusChips: { key: ProposalsFilter; label: string }[] = [
    { key: 'active', label: vi ? 'Đang hoạt động' : 'Active' },
    { key: 'completed', label: vi ? 'Đã hoàn thành' : 'Completed' },
    { key: 'archived', label: vi ? 'Đã lưu trữ' : 'Archived' },
  ];
  const sortOptions: { key: ProposalsSort; label: string }[] = [
    { key: 'active', label: vi ? 'Hoạt động nhất' : 'Most active' },
    { key: 'newest', label: vi ? 'Mới nhất' : 'Newest' },
    { key: 'participants', label: vi ? 'Nhiều người tham gia' : 'Most participants' },
    { key: 'soonest', label: vi ? 'Sắp diễn ra' : 'Soonest' },
  ];
  const statusDescriptions: Record<ProposalsFilter, string> = {
    active: vi
      ? 'Đề xuất đang nhận cam kết hoặc đã có lịch họp sắp tới.'
      : 'Proposals currently accepting commitments or with an upcoming meeting.',
    completed: vi
      ? 'Đề xuất đã được thực hiện và kết thúc, không chuyển sang giai đoạn dự án.'
      : 'Proposals that were executed and finished, not moved to a project phase.',
    archived: vi
      ? 'Đề xuất chưa được creator thực hiện. Là ý tưởng cần thêm sự tham gia và dẫn dắt từ thành viên.'
      : 'Proposals not yet executed by the creator. Ideas needing more member involvement and leadership.',
  };

  const statusFilterRow = (
    <div>
      <div className="flex gap-2 mb-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {statusChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onFilterChange(chip.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filter === chip.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {filter === 'active' && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span className="hidden sm:inline">{vi ? 'Sắp xếp:' : 'Sort:'}</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as ProposalsSort)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-xs focus:ring-blue-500 focus:border-blue-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500 italic mb-4">{statusDescriptions[filter]}</p>
    </div>
  );

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'ĐỀ XUẤT CỘNG ĐỒNG' : 'COMMUNITY PROPOSALS'}
        </h2>
        {statusFilterRow}
        <SkeletonRows />
      </div>
    );
  }

  if (proposals.length === 0) {
    const emptyMessages: Record<ProposalsFilter, string> = {
      active: vi ? 'Chưa có đề xuất nào đang hoạt động.' : 'No active proposals.',
      completed: vi ? 'Chưa có đề xuất nào đã hoàn thành.' : 'No completed proposals yet.',
      archived: vi ? 'Chưa có đề xuất nào đã lưu trữ.' : 'No archived proposals.',
    };
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'ĐỀ XUẤT CỘNG ĐỒNG' : 'COMMUNITY PROPOSALS'}
        </h2>
        {statusFilterRow}
        <EmptyState
          message={emptyMessages[filter]}
          cta={filter === 'active' ? (vi ? '+ Đề xuất ý tưởng' : '+ Propose an Idea') : undefined}
          href={filter === 'active' ? (session ? '/proposals/new' : '/login') : undefined}
        />
      </div>
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

  // For the legacy 'active' sort, re-apply engagement ordering client-side
  // (the server already pins-first). Other sorts come pre-ordered from the
  // server and we trust that order.
  const sorted = sort === 'active'
    ? [...proposals].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        const activityA = (a.commitment_count || 0) + (a.comment_count || 0);
        const activityB = (b.commitment_count || 0) + (b.comment_count || 0);
        return activityB - activityA;
      })
    : proposals;

  const filtered = activeGenre
    ? sorted.filter(p => (p.genre || 'other') === activeGenre)
    : sorted;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {vi ? 'ĐỀ XUẤT CỘNG ĐỒNG' : 'COMMUNITY PROPOSALS'}
      </h2>

      {statusFilterRow}

      {/* Genre filter — collapsed into a dropdown to free up vertical space. */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs text-gray-600">{vi ? 'Thể loại:' : 'Topic:'}</label>
        <select
          value={activeGenre ?? ''}
          onChange={(e) => setActiveGenre(e.target.value || null)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-xs focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{vi ? 'Tất cả' : 'All'}</option>
          {genres.map((genre) => {
            const genreInfo = PROPOSAL_GENRE_LABELS[genre as ProposalGenre] || PROPOSAL_GENRE_LABELS.other;
            return (
              <option key={genre} value={genre}>
                {genreInfo.icon} {genreInfo[vi ? 'vi' : 'en']} ({genreCounts.get(genre) || 0})
              </option>
            );
          })}
        </select>
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

function ProjectsTabContent({
  projects,
  loading,
  locale,
  filter,
  onFilterChange,
}: {
  projects: CommunityProposal[];
  loading: boolean;
  locale: string;
  filter: ProjectsFilter;
  onFilterChange: (f: ProjectsFilter) => void;
}) {
  const vi = locale === 'vi';
  const chips: { key: ProjectsFilter; label: string }[] = [
    { key: 'project_active', label: vi ? 'Đang hoạt động' : 'Active' },
    { key: 'project_completed', label: vi ? 'Đã hoàn thành' : 'Completed' },
    { key: 'project_discontinued', label: vi ? 'Đã dừng' : 'Discontinued' },
    { key: 'project_closed', label: vi ? 'Chuyển giai đoạn' : 'Closed Phase' },
  ];
  const descriptions: Record<ProjectsFilter, string> = {
    project_active: vi
      ? 'Dự án đang được triển khai bởi nhóm thành viên đã tham gia.'
      : 'Projects actively run by the joined member team.',
    project_completed: vi
      ? 'Dự án đã hoàn thành mục tiêu và kết thúc thành công.'
      : 'Projects that achieved their goals and finished successfully.',
    project_discontinued: vi
      ? 'Dự án đã dừng và không tiếp tục.'
      : 'Projects that were stopped and will not continue.',
    project_closed: vi
      ? 'Dự án đã chuyển sang giai đoạn khép kín — liên hệ creator để biết thêm.'
      : 'Projects in a closed phase — contact the creator for further participation.',
  };

  const filterRow = (
    <div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filter === chip.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 italic mb-4">{descriptions[filter]}</p>
    </div>
  );

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'DỰ ÁN CỘNG ĐỒNG' : 'COMMUNITY PROJECTS'}
        </h2>
        {filterRow}
        <SkeletonRows />
      </div>
    );
  }

  if (projects.length === 0) {
    const emptyMessages: Record<ProjectsFilter, string> = {
      project_active: vi ? 'Chưa có dự án nào đang hoạt động.' : 'No active projects.',
      project_completed: vi ? 'Chưa có dự án nào đã hoàn thành.' : 'No completed projects yet.',
      project_discontinued: vi ? 'Chưa có dự án nào đã dừng.' : 'No discontinued projects.',
      project_closed: vi ? 'Chưa có dự án nào chuyển giai đoạn.' : 'No closed-phase projects.',
    };
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {vi ? 'DỰ ÁN CỘNG ĐỒNG' : 'COMMUNITY PROJECTS'}
        </h2>
        {filterRow}
        <EmptyState message={emptyMessages[filter]} />
      </div>
    );
  }

  // Sort by start date (newest first), then engagement
  const sorted = [...projects].sort((a, b) => {
    const startA = a.project_started_at ? new Date(a.project_started_at).getTime() : 0;
    const startB = b.project_started_at ? new Date(b.project_started_at).getTime() : 0;
    if (startA !== startB) return startB - startA;
    const activityA = (a.commitment_count || 0) + (a.comment_count || 0);
    const activityB = (b.commitment_count || 0) + (b.comment_count || 0);
    return activityB - activityA;
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {vi ? 'DỰ ÁN CỘNG ĐỒNG' : 'COMMUNITY PROJECTS'}
      </h2>
      {filterRow}
      <div className="divide-y divide-gray-100">
        {sorted.map((project) => (
          <ProjectRow key={project.id} project={project} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({ project, locale }: { project: CommunityProposal; locale: string }) {
  const vi = locale === 'vi';
  const statusToneByKey: Record<string, { bg: string; text: string }> = {
    project_active: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    project_completed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    project_discontinued: { bg: 'bg-orange-50', text: 'text-orange-700' },
    project_closed: { bg: 'bg-amber-50', text: 'text-amber-700' },
  };
  const statusLabelByKey: Record<string, { vi: string; en: string }> = {
    project_active: { vi: 'Đang hoạt động', en: 'Active' },
    project_completed: { vi: 'Đã hoàn thành', en: 'Completed' },
    project_discontinued: { vi: 'Đã dừng', en: 'Discontinued' },
    project_closed: { vi: 'Chuyển giai đoạn', en: 'Closed Phase' },
  };
  const tone = statusToneByKey[project.status] || statusToneByKey.project_active;
  const statusLabel = (statusLabelByKey[project.status] || statusLabelByKey.project_active)[vi ? 'vi' : 'en'];
  const categoryLabel = PROPOSAL_CATEGORY_LABELS[project.category]?.[vi ? 'vi' : 'en'] || project.category;

  return (
    <Link href={`/proposals/${project.slug}`} className="block">
      <div className="py-4 hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base truncate">{project.title}</h3>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}>
                🚀 {statusLabel}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {project.author_name || 'Unknown'}
              {project.author_abg_class ? ` · ${project.author_abg_class}` : ''}
              {project.project_started_at && ` · ${vi ? 'Bắt đầu' : 'Started'} ${formatEventDate(project.project_started_at, locale)}`}
            </p>
            {project.project_status_note && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.project_status_note}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">
              {categoryLabel}
            </span>
            {typeof project.project_member_count === 'number' && project.project_member_count > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {project.project_member_count} {vi ? 'thành viên' : 'members'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function LibraryTabContent({
  items,
  canWatch,
  loading,
  locale,
  session,
}: {
  items: LibraryItem[];
  canWatch: boolean;
  loading: boolean;
  locale: string;
  session: ReturnType<typeof useSession>['data'];
}) {
  if (loading) return <SkeletonRows />;

  if (!session) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Đăng nhập để xem Thư viện workshop.' : 'Sign in to view the workshop Library.'}
        cta={locale === 'vi' ? 'Đăng nhập' : 'Sign in'}
        href="/login"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message={locale === 'vi' ? 'Chưa có bản ghi workshop trong Thư viện.' : 'No workshop recordings in the Library yet.'}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {locale === 'vi' ? 'THƯ VIỆN WORKSHOP' : 'WORKSHOP LIBRARY'}
        </h2>
        {!canWatch && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {locale === 'vi' ? 'Video dành cho Premium' : 'Videos are Premium only'}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <LibraryRow key={item.id} item={item} canWatch={canWatch} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function LibraryRow({ item, canWatch, locale }: { item: LibraryItem; canWatch: boolean; locale: string }) {
  return (
    <Link href={`/library/${item.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">{item.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {item.speaker_name || (locale === 'vi' ? 'ABG Alumni' : 'ABG Alumni')}
            {item.duration_text ? ` · ${item.duration_text}` : ''}
            {item.event_title ? ` · ${item.event_title}` : ''}
          </p>
          {item.description && (
            <p className="mt-1 line-clamp-1 text-sm text-gray-600">{item.description}</p>
          )}
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          {item.resource_links.length > 0 && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {item.resource_links.length} {locale === 'vi' ? 'tài nguyên' : 'resources'}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${canWatch ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {canWatch ? (locale === 'vi' ? 'Xem video' : 'Watch') : (locale === 'vi' ? 'Premium' : 'Premium')}
          </span>
        </div>
      </div>
    </Link>
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

function ProposalRow({
  proposal,
  locale,
  isAuthenticated,
  showUpcomingBadge = false,
}: {
  proposal: CommunityProposal;
  locale: string;
  isAuthenticated?: boolean;
  showUpcomingBadge?: boolean;
}) {
  const vi = locale === 'vi';
  const categoryColors: Record<string, { bg: string; text: string }> = {
    charity: { bg: 'bg-rose-50', text: 'text-rose-600' },
    event: { bg: 'bg-amber-50', text: 'text-amber-600' },
    learning: { bg: 'bg-blue-50', text: 'text-blue-600' },
    community_support: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    other: { bg: 'bg-violet-50', text: 'text-violet-600' },
  };
  const colors = categoryColors[proposal.category] || categoryColors.other;
  const categoryLabel = PROPOSAL_CATEGORY_LABELS[proposal.category]?.[vi ? 'vi' : 'en'] || proposal.category;
  const posted = proposal.created_at ? timeAgo(proposal.created_at, vi) : '';
  const eventDate = proposal.next_event_date
    ? formatEventDate(proposal.next_event_date, locale)
    : null;

  return (
    <Link href={`/proposals/${proposal.slug}`} className="block">
      <div className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base truncate">{proposal.title}</h3>
            {showUpcomingBadge && (
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                💡 {vi ? 'Đề xuất' : 'Proposal'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {proposal.author_name || 'Unknown'}{proposal.author_abg_class ? ` · ${proposal.author_abg_class}` : ''}
            {proposal.location && <span> · 📍 {proposal.location}</span>}
            {proposal.participation_format && (
              <span> · {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.icon} {PARTICIPATION_FORMAT_LABELS[proposal.participation_format as ParticipationFormat]?.[vi ? 'vi' : 'en'] || proposal.participation_format}</span>
            )}
            {posted && <span> · {posted}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {eventDate && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
              📅 {eventDate}
            </span>
          )}
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
