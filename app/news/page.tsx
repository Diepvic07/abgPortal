import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getPublishedNews } from '@/lib/news-service';
import { NewsHeroSection } from '@/components/news/news-hero-section';
import { NewsCategoryFilter } from '@/components/news/news-category-filter';
import { NewsGrid } from '@/components/news/news-grid';

export const dynamic = 'force-dynamic';

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
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'vi';

  let articles: Awaited<ReturnType<typeof getPublishedNews>> = [];
  try {
    articles = await getPublishedNews(category, locale);
  } catch {
    // News may not exist yet
  }

  return (
    <div className="news-page-wrapper">
      <NewsHeroSection />
      <NewsCategoryFilter activeCategory={category ?? 'All'} />
      <NewsGrid articles={articles} activeCategory={category ?? 'All'} />
    </div>
  );
}
