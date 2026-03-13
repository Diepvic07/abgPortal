import { getTranslations } from '@/lib/i18n';
import { getServerLocale } from '@/lib/i18n/server-locale';
import { getHomepageStats, getFeaturedMemberAvatars } from '@/lib/homepage-stats';
import { getPublishedNews } from '@/lib/news-service';
import { HomepageHeroSection } from '@/components/homepage/hero-section';
import { WhatIsAbgSection } from '@/components/homepage/what-is-abg-section';
import { WhyJoinSection } from '@/components/homepage/why-join-section';
import { WhatYouCanDoSection } from '@/components/homepage/what-you-can-do-section';
import { HomepageHowItWorksSection } from '@/components/homepage/how-it-works-section';
import { StatsSection } from '@/components/homepage/stats-section';
import { NewsPreviewSection } from '@/components/homepage/news-preview-section';
import { FinalCtaSection } from '@/components/homepage/final-cta-section';

export default async function HomePage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  const [stats, news, featuredMembers] = await Promise.all([
    getHomepageStats(),
    getPublishedNews(undefined, locale),
    getFeaturedMemberAvatars(6),
  ]);

  const previewNews = news.slice(0, 3);

  return (
    <>
      <HomepageHeroSection hero={t.homepage.hero} featuredMembers={featuredMembers} alumniCount={stats.alumniCount} />
      <WhatIsAbgSection whatIsAbg={t.homepage.whatIsAbg} />
      <WhyJoinSection whyJoin={t.homepage.whyJoin} />
      <WhatYouCanDoSection whatYouCanDo={t.homepage.whatYouCanDo} />
      <HomepageHowItWorksSection howItWorks={t.homepage.howItWorks} />
      <StatsSection stats={stats} labels={t.homepage.stats} />
      <NewsPreviewSection articles={previewNews} labels={t.homepage.newsPreview} locale={locale} />
      <FinalCtaSection finalCta={t.homepage.finalCta} />
    </>
  );
}
