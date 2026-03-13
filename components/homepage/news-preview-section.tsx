import Link from 'next/link';
import type { Translations, Locale } from '@/lib/i18n';
import type { NewsArticle } from '@/types';
import { NewsCard } from '@/components/news/news-card';
import { getTranslations } from '@/lib/i18n';

interface NewsPreviewSectionProps {
  articles: NewsArticle[];
  labels: Translations['homepage']['newsPreview'];
  locale: Locale;
}

export function NewsPreviewSection({ articles, labels, locale }: NewsPreviewSectionProps) {
  const t = getTranslations(locale);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  if (articles.length === 0) return null;

  return (
    <section className="homepage-full-bleed py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {labels.title}
            </h2>
            <p className="mt-4 text-slate-600 text-lg">{labels.subtitle}</p>
          </div>
          <Link
            href="/news"
            className="hidden md:flex items-center text-blue-600 font-bold group"
          >
            {labels.viewAll}
            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.slice(0, 3).map((article) => (
            <NewsCard
              key={article.slug}
              article={article}
              readFullStoryLabel={labels.readMore}
              categoryLabel={t.news.categories[article.category.toLowerCase() as keyof typeof t.news.categories] || article.category}
              dateLocale={dateLocale}
              locale={locale}
            />
          ))}
        </div>

        {/* Mobile "View All" button */}
        <div className="mt-12 text-center md:hidden">
          <Link
            href="/news"
            className="inline-flex btn-secondary px-6 py-3 rounded-xl text-md font-bold"
          >
            {labels.viewAll}
          </Link>
        </div>
      </div>
    </section>
  );
}
