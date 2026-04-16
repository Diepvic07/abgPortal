'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  is_read: boolean;
  created_at: string;
}

/** Strip @[Name](id) → @Name for display */
function stripMentionMarkup(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

export function NotificationList() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch {
      // Silently fail
    }
  };

  const handleMarkRead = (id: string) => {
    // Optimistic update. keepalive survives navigation when the user clicks a Link.
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Silently fail
    }
  };

  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }

  function getTypeIcon(type: string) {
    const iconMap: Record<string, { bg: string; color: string; path: string }> = {
      new_proposal: {
        bg: 'bg-blue-100', color: 'text-blue-600',
        path: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      },
      new_event: {
        bg: 'bg-green-100', color: 'text-green-600',
        path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      connection_request: {
        bg: 'bg-purple-100', color: 'text-purple-600',
        path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      },
      proposal_comment: {
        bg: 'bg-amber-100', color: 'text-amber-600',
        path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      },
    };

    const icon = iconMap[type] || { bg: 'bg-gray-100', color: 'text-gray-600', path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' };

    return (
      <div className={`w-10 h-10 rounded-full ${icon.bg} flex items-center justify-center flex-shrink-0`}>
        <svg className={`w-5 h-5 ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
        </svg>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t.notifications?.title || 'Thông báo'}
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {unreadCount} mới
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t.notifications?.markAllRead || 'Đánh dấu đã đọc'}
            </button>
          )}
          <Link
            href="/profile/notifications"
            className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t.notifications?.viewSettings || 'Cài đặt'}
          </Link>
        </div>
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-gray-500">{t.notifications?.empty || 'Chưa có thông báo'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <div
                className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                  !n.is_read
                    ? 'bg-blue-50/60 border-blue-100 hover:bg-blue-50'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                {getTypeIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{stripMentionMarkup(n.body)}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMarkRead(n.id);
                      }}
                      className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 hover:bg-blue-600 transition-colors"
                      title="Đánh dấu đã đọc"
                    />
                  )}
                </div>
              </div>
            );

            return n.url ? (
              <Link key={n.id} href={n.url} className="block" onClick={() => !n.is_read && handleMarkRead(n.id)}>
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
