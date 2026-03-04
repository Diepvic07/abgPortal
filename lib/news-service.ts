import { NewsArticle } from '@/types';
import { getNewsArticles, getNewsArticleBySlug } from './supabase-db';
import { SAMPLE_NEWS_ARTICLES } from './news-sample-data';

export async function getPublishedNews(category?: string, locale: string = 'vi'): Promise<NewsArticle[]> {
  const articles = await getNewsArticles(category, locale);
  if (articles.length === 0) {
    return category
      ? SAMPLE_NEWS_ARTICLES.filter(a => a.category === category)
      : SAMPLE_NEWS_ARTICLES;
  }
  return articles;
}

export async function getNewsBySlug(slug: string, locale: string = 'vi'): Promise<NewsArticle | null> {
  const article = await getNewsArticleBySlug(slug, locale);
  if (article) return article;
  return SAMPLE_NEWS_ARTICLES.find(a => a.slug === slug) ?? null;
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
