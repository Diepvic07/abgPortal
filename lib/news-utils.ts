import { NewsArticle, NewsCategory } from '@/types';
import slugifyLib from 'slugify';

/**
 * Returns localized title/excerpt/content. Falls back to the other language
 * when the preferred language's field is empty — admins often publish in both
 * languages without supplying a translation for every field.
 */
export function localizeArticle(
  article: NewsArticle,
  locale: string
): { title: string; excerpt: string; content: string } {
  const pick = (preferred: string | undefined, fallback: string | undefined) =>
    (preferred && preferred.trim()) || (fallback && fallback.trim()) || '';

  if (locale === 'vi') {
    return {
      title: pick(article.title_vi, article.title),
      excerpt: pick(article.excerpt_vi, article.excerpt),
      content: pick(article.content_vi, article.content),
    };
  }
  return {
    title: pick(article.title, article.title_vi),
    excerpt: pick(article.excerpt, article.excerpt_vi),
    content: pick(article.content, article.content_vi),
  };
}

export function generateSlug(title: string): string {
  return slugifyLib(title, { lower: true, strict: true, locale: 'vi' });
}

export function getCategoryColor(category: NewsCategory): string {
  const colors: Record<NewsCategory, string> = {
    Edu: 'bg-blue-100 text-blue-800',
    Business: 'bg-emerald-100 text-emerald-800',
    Event: 'bg-purple-100 text-purple-800',
    Course: 'bg-amber-100 text-amber-800',
    Announcement: 'bg-rose-100 text-rose-800',
  };
  return colors[category] ?? 'bg-gray-100 text-gray-800';
}

