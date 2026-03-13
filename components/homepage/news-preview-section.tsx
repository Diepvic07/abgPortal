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
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
            {labels.title}
          </h2>
          <Link
            href="/news"
            className="text-brand-light font-medium text-sm hover:underline"
          >
            {labels.viewAll} &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </section>
  );
}
