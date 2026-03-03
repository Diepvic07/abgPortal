'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NewsArticle } from '@/types';
import { getCategoryColor } from '@/lib/news-utils';
import { useTranslation } from '@/lib/i18n';

interface ArticleHeaderProps {
  article: NewsArticle;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formattedDate = new Date(article.published_date).toLocaleDateString(dateLocale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const categoryKey = article.category.toLowerCase() as keyof typeof t.news.categories;
  const categoryLabel = t.news.categories[categoryKey] ?? article.category;

  function shareTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  }

  function shareLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may not be available */ }
  }

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
        <div className="ml-auto flex items-center gap-2">
          <button onClick={shareTwitter} title={t.news.shareTwitter}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          <button onClick={shareLinkedIn} title={t.news.shareLinkedIn}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
            </svg>
          </button>
          <button onClick={copyLink} title={copied ? t.news.linkCopied : t.news.copyLink}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">
        {article.title}
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
    </div>
  );
}
