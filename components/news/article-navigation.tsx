'use client';

import Link from 'next/link';
import { NewsArticle } from '@/types';
import { localizeArticle } from '@/lib/news-utils';
import { useTranslation } from '@/lib/i18n';

interface ArticleNavigationProps {
  prev: NewsArticle | null;
  next: NewsArticle | null;
}

export function ArticleNavigation({ prev, next }: ArticleNavigationProps) {
  const { t, locale } = useTranslation();
  const prevLocalized = prev ? localizeArticle(prev, locale) : null;
  const nextLocalized = next ? localizeArticle(next, locale) : null;

  if (!prev && !next) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 border-t border-gray-200 mt-12 pt-8 grid grid-cols-2 gap-4">
      <div className="col-start-1">
        {prev && (
          <Link href={`/news/${prev.slug}`}
            className="group flex flex-col gap-1 hover:text-brand transition-colors">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {t.news.previousArticle}
            </span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-brand
              group-hover:-translate-x-1 transition-transform line-clamp-2">
              &larr; {prevLocalized!.title}
            </span>
          </Link>
        )}
      </div>
      <div className="col-start-2 text-right">
        {next && (
          <Link href={`/news/${next.slug}`}
            className="group flex flex-col gap-1 items-end hover:text-brand transition-colors">
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {t.news.nextArticle}
            </span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-brand
              group-hover:translate-x-1 transition-transform line-clamp-2">
              {nextLocalized!.title} &rarr;
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
