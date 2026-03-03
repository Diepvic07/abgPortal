import type { Metadata } from 'next';
import { getPublishedNews } from '@/lib/news-service';
import { NewsHeroSection } from '@/components/news/news-hero-section';
import { NewsCategoryFilter } from '@/components/news/news-category-filter';
import { NewsGrid } from '@/components/news/news-grid';

export const revalidate = 3600;

interface NewsPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ searchParams }: NewsPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const title = category ? `${category} – News & Announcements` : 'News & Announcements';
  return {
    title: `${title} | ABG Alumni Connect`,
    description: 'Stay updated with the latest news, events, and opportunities from the ABG Alumni community.',
  };
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { category } = await searchParams;
  let articles: Awaited<ReturnType<typeof getPublishedNews>> = [];
  try {
    articles = await getPublishedNews(category);
  } catch {
    // News sheet may not exist yet
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <NewsHeroSection />
      <NewsCategoryFilter activeCategory={category ?? 'All'} />
      <NewsGrid articles={articles} />
    </div>
  );
}
