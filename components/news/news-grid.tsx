'use client';

import { useState } from 'react';
import { NewsArticle } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { NewsCard } from './news-card';

const INITIAL_COUNT = 9;
const LOAD_MORE_COUNT = 6;

interface NewsGridProps {
  articles: NewsArticle[];
  activeCategory?: string;
}

export function NewsGrid({ articles, activeCategory = 'All' }: NewsGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const { t, locale } = useTranslation();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  if (articles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">{t.news.noArticles}</p>
      </div>
    );
  }

  const visible = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  const categoryKey = activeCategory.toLowerCase() as keyof typeof t.news.categories;
  const categoryLabel = activeCategory === 'All'
    ? t.news.categories.all
    : (t.news.categories[categoryKey] ?? activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Info bar */}
      <div className="flex items-center justify-between py-4 text-sm text-gray-500">
        <span>{t.news.showingArticles.replace('{category}', categoryLabel)}</span>
        <span>{t.news.itemCount.replace('{count}', String(articles.length))}</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visible.map((article, index) => (
          <NewsCard
            key={article.id}
            article={article}
            featured={index === 0}
            readFullStoryLabel={t.news.readFullStory}
            categoryLabel={t.news.categories[article.category.toLowerCase() as keyof typeof t.news.categories] ?? article.category}
            dateLocale={dateLocale}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-10 mb-8">
          <button
            onClick={() => setVisibleCount(c => c + LOAD_MORE_COUNT)}
            className="px-8 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium
              text-gray-700 hover:border-brand hover:text-brand transition-colors"
          >
            {t.news.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
