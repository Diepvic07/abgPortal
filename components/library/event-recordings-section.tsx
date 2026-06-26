'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LibraryItem } from '@/types';

type Props = {
  locale: string;
  eventId?: string;
  proposalId?: string;
};

export function EventRecordingsSection({ eventId, proposalId, locale }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [canWatch, setCanWatch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId && !proposalId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRecordings() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (eventId) params.set('event_id', eventId);
        if (proposalId) params.set('proposal_id', proposalId);
        const res = await fetch(`/api/library?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setItems(data.library_items || []);
          setCanWatch(!!data.can_watch);
        }
      } catch (error) {
        console.error('Failed to fetch recordings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRecordings();

    return () => {
      cancelled = true;
    };
  }, [eventId, proposalId]);

  if (loading || items.length === 0) return null;

  const isVi = locale === 'vi';

  if (!canWatch) {
    return (
      <section className="mt-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 shadow-sm">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white">
          <span>🔒</span>
          <span>{isVi ? 'Bản ghi Premium' : 'Premium Recording'}</span>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-3xl text-white shadow-md sm:flex">
              🎬
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-amber-950">
                {items.length === 1
                  ? items[0].title
                  : isVi
                    ? `${items.length} bản ghi từ buổi này`
                    : `${items.length} recordings from this session`}
              </h2>
              {items.length === 1 && items[0].description && (
                <p className="mt-1 line-clamp-2 text-sm text-amber-900/80">{items[0].description}</p>
              )}
              <p className="mt-3 text-sm leading-6 text-amber-900">
                {isVi
                  ? 'Nâng cấp Premium để xem lại toàn bộ workshop, slides và tài nguyên đi kèm.'
                  : 'Upgrade to Premium to rewatch the full workshop, slides, and bundled resources.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] hover:shadow-lg"
                >
                  <span>⭐</span>
                  <span>{isVi ? 'Nâng cấp Premium' : 'Upgrade to Premium'}</span>
                </Link>
                <span className="text-xs text-amber-900/70">
                  {isVi ? 'Mở khóa toàn bộ thư viện workshop' : 'Unlock the full workshop library'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-blue-950">
            {isVi ? 'Bản ghi workshop' : 'Workshop Recordings'}
          </h2>
          <p className="mt-1 text-sm text-blue-800">
            {isVi
              ? 'Xem lại bản ghi, slides và tài nguyên đi kèm.'
              : 'Rewatch the recording, slides, and bundled resources.'}
          </p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          Premium ✓
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/library/${item.slug}`}
            className="block rounded-2xl border border-blue-100 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {item.speaker_name || 'ABG Alumni'}
                  {item.duration_text ? ` · ${item.duration_text}` : ''}
                  {item.resource_links.length > 0 ? ` · ${item.resource_links.length} ${isVi ? 'tài nguyên' : 'resources'}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                {isVi ? 'Xem' : 'Watch'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
