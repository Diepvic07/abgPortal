'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

const CATEGORIES = ['All', 'Edu', 'Business', 'Event', 'Course', 'Announcement'] as const;
const CATEGORY_KEYS: Record<string, string> = {
  All: 'all', Edu: 'edu', Business: 'business',
  Event: 'event', Course: 'course', Announcement: 'announcement',
};

interface NewsCategoryFilterProps {
  activeCategory?: string;
}

export function NewsCategoryFilter({ activeCategory = 'All' }: NewsCategoryFilterProps) {
  const router = useRouter();
  const { t } = useTranslation();

  function handleSelect(category: string) {
    router.push(category === 'All' ? '/news' : `/news?category=${category}`);
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative">
          {/* Fade edge for mobile scroll */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden" />
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide snap-x snap-mandatory">
            {CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory || (cat === 'All' && !activeCategory);
              const key = CATEGORY_KEYS[cat] as keyof typeof t.news.categories;
              const label = t.news.categories[key];
              return (
                <button
                  key={cat}
                  onClick={() => handleSelect(cat)}
                  className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    isActive
                      ? 'bg-blue-50 text-brand border-blue-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
