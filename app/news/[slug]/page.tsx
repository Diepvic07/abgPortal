import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getNewsBySlug, getPublishedNews, getAdjacentArticles } from '@/lib/news-service';
import { localizeArticle } from '@/lib/news-utils';
import { ArticleHeader } from '@/components/news/article-header';
import { ArticleContent } from '@/components/news/article-content';
import { ArticleNavigation } from '@/components/news/article-navigation';
import { NewsComments } from '@/components/news/news-comments';

export const dynamic = 'force-dynamic';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'vi';
  const article = await getNewsBySlug(slug, locale);
  if (!article) return { title: 'Article Not Found' };
  const { title, excerpt } = localizeArticle(article, locale);
  return {
    title: `${title} | ABG Alumni Connect`,
    description: excerpt,
    openGraph: {
      title,
      description: excerpt,
      images: article.image_url ? [{ url: article.image_url }] : [],
      type: 'article',
      publishedTime: article.published_date,
      authors: [article.author_name],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'vi';

  const article = await getNewsBySlug(slug, locale);
  if (!article) notFound();
  const localized = localizeArticle(article, locale);
  const { prev, next } = await getAdjacentArticles(slug, undefined, locale);

  return (
    <div className="news-page-wrapper bg-white">
      <div className="py-8 md:py-12">
        <ArticleHeader article={article} />

        {/* Hero image */}
        {article.image_url && (
          <div className="max-w-5xl mx-auto px-4 mb-10">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm">
              <Image src={article.image_url} alt={localized.title} fill
                className="object-cover" priority />
            </div>
          </div>
        )}

        <ArticleContent article={article} />
        <NewsComments slug={slug} />
        <ArticleNavigation prev={prev} next={next} />
      </div>
    </div>
  );
}
