'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LibraryItem } from '@/types';

export function LibraryPill({ slug, locale }: { slug: string; locale: string }) {
  const isVi = locale === 'vi';
  return (
    <Link
      href={`/library/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 transition-colors hover:from-amber-200 hover:to-orange-200"
      title={isVi ? 'Xem bản ghi trong Thư viện' : 'Watch recording in Library'}
    >
      <span>🎬</span>
      <span>{isVi ? 'Bản ghi' : 'Library'}</span>
    </Link>
  );
}

export function LibraryAutoPill({
  eventId,
  proposalId,
  locale,
}: {
  eventId?: string;
  proposalId?: string;
  locale: string;
}) {
  const [item, setItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    if (!eventId && !proposalId) return;
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams();
        if (eventId) params.set('event_id', eventId);
        if (proposalId) params.set('proposal_id', proposalId);
        const res = await fetch(`/api/library?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.library_items?.length > 0) {
          setItem(data.library_items[0]);
        }
      } catch (error) {
        console.error('Failed to fetch library quick link:', error);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, proposalId]);

  if (!item) return null;
  return <LibraryPill slug={item.slug} locale={locale} />;
}
