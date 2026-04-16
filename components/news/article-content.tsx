'use client';

import { NewsArticle } from '@/types';
import { localizeArticle } from '@/lib/news-utils';
import { useTranslation } from '@/lib/i18n';
import { ArticleMarkdown } from './article-markdown';

interface ArticleContentProps {
  article: NewsArticle;
}

export function ArticleContent({ article }: ArticleContentProps) {
  const { locale } = useTranslation();
  const { content } = localizeArticle(article, locale);

  return (
    <div className="max-w-3xl mx-auto px-4">
      <ArticleMarkdown content={content} />
    </div>
  );
}
