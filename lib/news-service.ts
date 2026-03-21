import { NewsArticle } from '@/types';
import { getNewsArticles, getNewsArticleBySlug } from './supabase-db';

export async function getPublishedNews(category?: string, locale: string = 'vi'): Promise<NewsArticle[]> {
  return getNewsArticles(category, locale);
}

export async function getNewsBySlug(slug: string, locale: string = 'vi'): Promise<NewsArticle | null> {
  return getNewsArticleBySlug(slug, locale);
}

export async function getAdjacentArticles(
  currentSlug: string,
  category?: string,
  locale: string = 'vi'
): Promise<{ prev: NewsArticle | null; next: NewsArticle | null }> {
  const articles = await getPublishedNews(category, locale);
  const index = articles.findIndex(a => a.slug === currentSlug);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < articles.length - 1 ? articles[index + 1] : null,
    next: index > 0 ? articles[index - 1] : null,
  };
}
