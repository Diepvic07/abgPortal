'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { CommunityEvent, EventRsvp, EventComment, CommitmentLevel, COMMITMENT_LABELS, EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '@/types';

const RSVP_OPTIONS: { level: CommitmentLevel; points: number }[] = [
  { level: 'interested', points: 0 },
  { level: 'will_participate', points: 3 },
  { level: 'will_lead', points: 5 },
];

function formatDateTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return `${diffMins}${locale === 'vi' ? ' phút trước' : 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${locale === 'vi' ? ' giờ trước' : 'h ago'}`;
    if (diffDays < 7) return `${diffDays}${locale === 'vi' ? ' ngày trước' : 'd ago'}`;
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function EventDetail({ eventId }: { eventId: string }) {
  const { t, locale } = useTranslation();
  const { data: session } = useSession();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [myRsvp, setMyRsvp] = useState<CommitmentLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchComments();
  }, [eventId]);

  async function fetchEvent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/events?id=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          setEvent(data.event);
          setRsvps(data.rsvps || []);
          setMyRsvp(data.my_rsvp || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/community/events/${eventId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }

  async function handleRsvp(level: CommitmentLevel) {
    if (rsvpLoading) return;

    // If clicking the same level, remove RSVP
    if (myRsvp === level) {
      setRsvpLoading(true);
      try {
        const res = await fetch(`/api/community/events/${eventId}/rsvp`, { method: 'DELETE' });
        if (res.ok) {
          setMyRsvp(null);
          // Optimistic: decrement count
          if (event) setEvent({ ...event, rsvp_count: Math.max(0, event.rsvp_count - 1) });
          fetchEvent(); // refresh full data
        }
      } catch (error) {
        console.error('Failed to remove RSVP:', error);
      } finally {
        setRsvpLoading(false);
      }
      return;
    }

    setRsvpLoading(true);
    const wasNew = myRsvp === null;
    setMyRsvp(level); // Optimistic update
    if (wasNew && event) {
      setEvent({ ...event, rsvp_count: event.rsvp_count + 1 });
    }

    try {
      const res = await fetch(`/api/community/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitment_level: level }),
      });
      if (!res.ok) {
        // Revert optimistic update
        setMyRsvp(null);
        if (wasNew && event) setEvent({ ...event, rsvp_count: event.rsvp_count });
      } else {
        fetchEvent(); // refresh to get accurate counts
      }
    } catch (error) {
      console.error('Failed to RSVP:', error);
      setMyRsvp(null);
      if (wasNew && event) setEvent({ ...event, rsvp_count: event.rsvp_count });
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/community/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (res.ok) {
        setCommentBody('');
        fetchComments();
        if (event) setEvent({ ...event, comment_count: event.comment_count + 1 });
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setCommentLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-50 rounded w-1/2 mb-8" />
          <div className="h-32 bg-gray-50 rounded mb-8" />
          <div className="h-12 bg-gray-50 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">{locale === 'vi' ? 'Không tìm thấy sự kiện.' : 'Event not found.'}</p>
        <Link href="/events" className="text-blue-600 hover:underline mt-2 inline-block">
          {locale === 'vi' ? 'Quay lại' : 'Back to events'}
        </Link>
      </div>
    );
  }

  const categoryLabel = EVENT_CATEGORY_LABELS[event.category]?.[locale === 'vi' ? 'vi' : 'en'] || event.category;
  const statusInfo = EVENT_STATUS_LABELS[event.status];
  const capacityPercent = event.capacity ? (event.rsvp_count / event.capacity) * 100 : 0;
  const isFull = event.capacity ? event.rsvp_count >= event.capacity : false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/events" className="hover:text-blue-600">{locale === 'vi' ? 'Sự kiện' : 'Events'}</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-900">{event.title}</span>
      </nav>

      {/* Title and badges */}
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{event.title}</h1>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          event.category === 'charity' ? 'bg-rose-50 text-rose-600' :
          event.category === 'event' ? 'bg-amber-50 text-amber-600' :
          event.category === 'learning' ? 'bg-blue-50 text-blue-600' :
          event.category === 'community_support' ? 'bg-emerald-50 text-emerald-600' :
          event.category === 'networking' ? 'bg-teal-50 text-teal-600' :
          'bg-violet-50 text-violet-600'
        }`}>
          {categoryLabel}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          statusInfo.color === 'green' ? 'bg-green-50 text-green-600' :
          statusInfo.color === 'blue' ? 'bg-blue-50 text-blue-600' :
          statusInfo.color === 'red' ? 'bg-red-50 text-red-600' :
          'bg-gray-50 text-gray-600'
        }`}>
          {statusInfo[locale === 'vi' ? 'vi' : 'en']}
        </span>
      </div>

      {/* Event metadata */}
      <div className="space-y-2 mb-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          <span>{formatDateTime(event.event_date, locale)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {event.location_url ? (
              <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{event.location}</a>
            ) : (
              <span>{event.location}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zM6.75 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>
            {event.rsvp_count} {locale === 'vi' ? 'đăng ký' : 'RSVPs'}
            {event.capacity && ` / ${event.capacity} ${locale === 'vi' ? 'chỗ' : 'capacity'}`}
          </span>
        </div>
        {/* Capacity progress bar */}
        {event.capacity && (
          <div className="w-48 ml-6">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  capacityPercent > 95 ? 'bg-red-500' :
                  capacityPercent > 80 ? 'bg-amber-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, capacityPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Proposal attribution */}
      {event.proposal_id && (
        <p className="text-sm text-gray-500 mb-4">
          {locale === 'vi' ? 'Từ đề xuất của' : 'From proposal by'}{' '}
          <Link href={`/proposals/${event.proposal_id}`} className="text-blue-600 hover:underline">
            {event.author_name || 'member'}
          </Link>
        </p>
      )}

      {/* Description */}
      <div className="prose prose-sm max-w-none mb-8 text-gray-700 whitespace-pre-wrap">
        {event.description}
      </div>

      {/* RSVP Section */}
      {event.status === 'published' && (
        <div className="mb-8 p-4 bg-gray-50 rounded-xl">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {locale === 'vi' ? 'Đăng ký tham gia' : 'RSVP'}
          </h2>
          <div className="flex gap-2">
            {RSVP_OPTIONS.map(({ level }) => {
              const isSelected = myRsvp === level;
              const label = COMMITMENT_LABELS[level][locale === 'vi' ? 'vi' : 'en'];
              return (
                <button
                  key={level}
                  onClick={() => handleRsvp(level)}
                  disabled={rsvpLoading || isFull}
                  aria-pressed={isSelected}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? level === 'will_lead'
                        ? 'bg-blue-800 text-white scale-[1.02]'
                        : level === 'will_participate'
                        ? 'bg-blue-600 text-white scale-[1.02]'
                        : 'bg-gray-700 text-white scale-[1.02]'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  } ${rsvpLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isFull && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {isFull && !myRsvp && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              {locale === 'vi' ? 'Sự kiện đã đầy' : 'Event is full'}
            </p>
          )}
        </div>
      )}

      {/* RSVP participants list */}
      {rsvps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {locale === 'vi' ? 'Người tham gia' : 'Participants'} ({rsvps.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 text-sm"
                title={COMMITMENT_LABELS[rsvp.commitment_level]?.[locale === 'vi' ? 'vi' : 'en']}
              >
                {rsvp.member_avatar_url ? (
                  <img src={rsvp.member_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                    {(rsvp.member_name || '?')[0]}
                  </div>
                )}
                <span className="text-gray-700">{rsvp.member_name || 'Member'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussion Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {locale === 'vi' ? 'Thảo luận' : 'Discussion'} ({event.comment_count})
        </h2>

        {/* Comment input */}
        {session && event.status === 'published' && (
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={locale === 'vi' ? 'Bắt đầu cuộc trò chuyện! Chia sẻ điều bạn mong đợi.' : 'Start the conversation! Share what you\'re looking forward to.'}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!commentBody.trim() || commentLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentLoading
                  ? (locale === 'vi' ? 'Đang gửi...' : 'Posting...')
                  : (locale === 'vi' ? 'Gửi bình luận' : 'Post Comment')}
              </button>
            </div>
          </form>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {locale === 'vi' ? 'Bắt đầu cuộc trò chuyện! Chia sẻ điều bạn mong đợi.' : 'Start the conversation! Share what you\'re looking forward to.'}
          </p>
        ) : (
          <div className="space-y-4" aria-live="polite">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {comment.member_avatar_url ? (
                  <img src={comment.member_avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white flex-shrink-0">
                    {(comment.member_name || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.member_name || 'Member'}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(comment.created_at, locale)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
