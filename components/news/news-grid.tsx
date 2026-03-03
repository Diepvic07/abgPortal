'use client';

import { useState } from 'react';
import { NewsArticle } from '@/types';
import { NewsCard } from './news-card';

const INITIAL_COUNT = 9;
const LOAD_MORE_COUNT = 6;

interface NewsGridProps {
  articles: NewsArticle[];
}

export function NewsGrid({ articles }: NewsGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  if (articles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No articles found in this category.</p>
      </div>
    );
  }

  const visible = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visible.map((article, index) => (
          <NewsCard
            key={article.id}
            article={article}
            featured={index === 0}
          />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-10">
          <button
            onClick={() => setVisibleCount(c => c + LOAD_MORE_COUNT)}
            className="px-6 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:border-brand hover:text-brand transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
