import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getNewsBySlug, getPublishedNews, getAdjacentArticles } from '@/lib/news-service';
import { ArticleHeader } from '@/components/news/article-header';
import { ArticleContent } from '@/components/news/article-content';
import { ArticleNavigation } from '@/components/news/article-navigation';

export const revalidate = 3600;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const articles = await getPublishedNews();
    return articles.map((a) => ({ slug: a.slug }));
  } catch {
    // News sheet may not exist yet — return empty for ISR fallback
    return [];
  }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) return { title: 'Article Not Found' };

  return {
    title: `${article.title} | ABG Alumni Connect`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.image_url ? [{ url: article.image_url }] : [],
      type: 'article',
      publishedTime: article.published_date,
      authors: [article.author_name],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) notFound();

  const { prev, next } = await getAdjacentArticles(slug);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <ArticleHeader article={article} />
      {article.image_url && (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden mb-8">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
      <ArticleContent content={article.content} />
      <ArticleNavigation prev={prev} next={next} />
    </div>
  );
}
