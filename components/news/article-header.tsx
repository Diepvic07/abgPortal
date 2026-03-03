import Link from 'next/link';
import { NewsArticle } from '@/types';
import { getCategoryColor } from '@/lib/news-utils';

interface ArticleHeaderProps {
  article: NewsArticle;
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const formattedDate = new Date(article.published_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-8">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-sm text-brand-light hover:text-brand mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to News
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(article.category)}`}>
          {article.category}
        </span>
        <span className="text-sm text-gray-400">{formattedDate}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
        {article.title}
      </h1>
      <p className="text-sm text-gray-500">
        By <span className="font-medium text-gray-700">{article.author_name}</span>
      </p>
    </div>
  );
}
