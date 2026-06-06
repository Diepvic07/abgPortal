'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LibraryItem } from '@/types';

export function EventRecordingsSection({
  eventId,
  locale,
}: {
  eventId: string;
  locale: string;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [canWatch, setCanWatch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecordings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/library?event_id=${eventId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setItems(data.library_items || []);
          setCanWatch(!!data.can_watch);
        }
      } catch (error) {
        console.error('Failed to fetch event recordings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRecordings();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-blue-950">
            {locale === 'vi' ? 'Bản ghi workshop' : 'Workshop Recordings'}
          </h2>
          <p className="mt-1 text-sm text-blue-800">
            {locale === 'vi'
              ? 'Video dành cho Premium; tài nguyên đi kèm mở theo từng mục.'
              : 'Videos are Premium only; linked resources are available per item.'}
          </p>
        </div>
        {!canWatch && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Premium
          </span>
        )}
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
                  {item.resource_links.length > 0 ? ` · ${item.resource_links.length} ${locale === 'vi' ? 'tài nguyên' : 'resources'}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${canWatch ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {canWatch ? (locale === 'vi' ? 'Xem' : 'Watch') : 'Premium'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
