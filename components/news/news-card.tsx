import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle } from '@/types';
import { getCategoryColor, localizeArticle } from '@/lib/news-utils';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  readFullStoryLabel: string;
  categoryLabel: string;
  dateLocale?: string;
  locale?: string;
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function NewsCard({ article, featured = false, readFullStoryLabel, categoryLabel, dateLocale = 'en-US', locale = 'en' }: NewsCardProps) {
  const localized = localizeArticle(article, locale);
  const formattedDate = new Date(article.published_date).toLocaleDateString(dateLocale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const isEvent = article.category === 'Event';
  const spanTwo = featured || isEvent;

  return (
    <Link
      href={`/news/${article.slug}`}
      className={`group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
        hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer
        ${spanTwo ? 'lg:col-span-2' : ''}`}
    >
      {article.image_url && (
        <div className={`relative overflow-hidden ${featured ? 'h-56 lg:h-64' : 'h-48'}
          ${isEvent ? 'grayscale group-hover:grayscale-0 transition-all duration-500' : ''}`}>
          <Image
            src={article.image_url} alt={article.title} fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes={spanTwo ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
          />
          <div className="absolute top-4 left-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(article.category)}`}>
              {categoryLabel}
            </span>
          </div>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        {!article.image_url && (
          <div className="mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(article.category)}`}>
              {categoryLabel}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-400">
          <CalendarIcon />
          <span>{formattedDate}</span>
        </div>
        <h2 className={`font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-brand transition-colors
          ${featured ? 'text-xl' : 'text-base'}`}>
          {localized.title}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-3 flex-1">{localized.excerpt}</p>
        <span className="mt-4 text-sm font-medium text-brand-light">
          {readFullStoryLabel} &rarr;
        </span>
      </div>
    </Link>
  );
}
