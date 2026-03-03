import { NewsCategory } from '@/types';

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
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

