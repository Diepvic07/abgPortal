import { NewsArticle } from '@/types';
import { getNewsArticles, getNewsArticleBySlug } from './google-sheets';
import { SAMPLE_NEWS_ARTICLES } from './news-sample-data';

export async function getPublishedNews(category?: string): Promise<NewsArticle[]> {
  const articles = await getNewsArticles(category);
  if (articles.length === 0) {
    return category
      ? SAMPLE_NEWS_ARTICLES.filter(a => a.category === category)
      : SAMPLE_NEWS_ARTICLES;
  }
  return articles;
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const article = await getNewsArticleBySlug(slug);
  if (article) return article;
  return SAMPLE_NEWS_ARTICLES.find(a => a.slug === slug) ?? null;
}

export async function getAdjacentArticles(
  currentSlug: string,
  category?: string
): Promise<{ prev: NewsArticle | null; next: NewsArticle | null }> {
  const articles = await getPublishedNews(category);
  const index = articles.findIndex(a => a.slug === currentSlug);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < articles.length - 1 ? articles[index + 1] : null,
    next: index > 0 ? articles[index - 1] : null,
  };
}
