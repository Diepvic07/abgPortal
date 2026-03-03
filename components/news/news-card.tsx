import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle } from '@/types';
import { getCategoryColor } from '@/lib/news-utils';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
}

export function NewsCard({ article, featured = false }: NewsCardProps) {
  const formattedDate = new Date(article.published_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link
      href={`/news/${article.slug}`}
      className={`group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col ${
        featured ? 'lg:col-span-2' : ''
      }`}
    >
      {article.image_url && (
        <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes={featured ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
          />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(article.category)}`}>
            {article.category}
          </span>
          <span className="text-xs text-gray-400">{formattedDate}</span>
        </div>
        <h2 className={`font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-brand transition-colors ${featured ? 'text-xl' : 'text-base'}`}>
          {article.title}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-3 flex-1">{article.excerpt}</p>
        <span className="mt-4 text-sm font-medium text-brand-light">Read more &rarr;</span>
      </div>
    </Link>
  );
}
