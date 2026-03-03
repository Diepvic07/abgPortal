import { NewsArticle } from '@/types';
import { getNewsArticles, getNewsArticleBySlug } from './google-sheets';

export async function getPublishedNews(category?: string): Promise<NewsArticle[]> {
  return getNewsArticles(category);
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  return getNewsArticleBySlug(slug);
}

export async function getAdjacentArticles(
  currentSlug: string,
  category?: string
): Promise<{ prev: NewsArticle | null; next: NewsArticle | null }> {
  const articles = await getNewsArticles(category);
  const index = articles.findIndex(a => a.slug === currentSlug);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < articles.length - 1 ? articles[index + 1] : null,
    next: index > 0 ? articles[index - 1] : null,
  };
}
