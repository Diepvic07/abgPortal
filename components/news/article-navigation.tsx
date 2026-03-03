import Link from 'next/link';
import { NewsArticle } from '@/types';

interface ArticleNavigationProps {
  prev: NewsArticle | null;
  next: NewsArticle | null;
}

export function ArticleNavigation({ prev, next }: ArticleNavigationProps) {
  if (!prev && !next) return null;

  return (
    <div className="border-t border-gray-200 mt-12 pt-8 grid grid-cols-2 gap-4">
      <div className="col-start-1">
        {prev && (
          <Link href={`/news/${prev.slug}`} className="group flex flex-col gap-1 hover:text-brand transition-colors">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Previous</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-brand line-clamp-2">
              &larr; {prev.title}
            </span>
          </Link>
        )}
      </div>
      <div className="col-start-2 text-right">
        {next && (
          <Link href={`/news/${next.slug}`} className="group flex flex-col gap-1 items-end hover:text-brand transition-colors">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Next</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-brand line-clamp-2">
              {next.title} &rarr;
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
