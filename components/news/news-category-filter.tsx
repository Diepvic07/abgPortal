'use client';

import { useRouter } from 'next/navigation';
import { getCategoryActiveBg } from '@/lib/news-utils';

const CATEGORIES = ['All', 'Edu', 'Business', 'Event', 'Course', 'Announcement'];

interface NewsCategoryFilterProps {
  activeCategory?: string;
}

export function NewsCategoryFilter({ activeCategory = 'All' }: NewsCategoryFilterProps) {
  const router = useRouter();

  function handleSelect(category: string) {
    if (category === 'All') {
      router.push('/news');
    } else {
      router.push(`/news?category=${category}`);
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
      {CATEGORIES.map((cat) => {
        const isActive = cat === activeCategory || (cat === 'All' && !activeCategory);
        return (
          <button
            key={cat}
            onClick={() => handleSelect(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? getCategoryActiveBg(cat)
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
