'use client';

import Link from 'next/link';
import { NewsArticle } from '@/types';
import { getCategoryColor, localizeArticle } from '@/lib/news-utils';
import { useTranslation } from '@/lib/i18n';
import {
  ArticleTaggedMembers,
  type TaggedMember,
} from '@/components/news/article-tagged-members';
import { ShareButtons } from '@/components/ui/share-buttons';

interface ArticleHeaderProps {
  article: NewsArticle;
  taggedMembers?: TaggedMember[];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ArticleHeader({ article, taggedMembers = [] }: ArticleHeaderProps) {
  const { t, locale } = useTranslation();
  const localized = localizeArticle(article, locale);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formattedDate = new Date(article.published_date).toLocaleDateString(dateLocale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const categoryKey = article.category.toLowerCase() as keyof typeof t.news.categories;
  const categoryLabel = t.news.categories[categoryKey] ?? article.category;

  return (
    <div className="max-w-4xl mx-auto px-4 mb-8">
      {/* Back link */}
      <Link href="/news"
        className="inline-flex items-center gap-1.5 text-sm text-brand-light hover:text-brand mb-8 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t.news.backToNews}
      </Link>

      {/* Metadata row: badge + date + share */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(article.category)}`}>
          {categoryLabel}
        </span>
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formattedDate}
        </div>
        <div className="ml-auto">
          <ShareButtons title={localized.title} />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {localized.title}
      </h1>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold">
          {getInitials(article.author_name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{article.author_name}</p>
          <p className="text-xs text-gray-500">{t.news.communityManagement}</p>
        </div>
      </div>

      {/* Tagged members */}
      <ArticleTaggedMembers members={taggedMembers} locale={locale} />
    </div>
  );
}
