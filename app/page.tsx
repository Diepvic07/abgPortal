'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import AboutAbgAlumniSection from '@/components/landing/about-abg-alumni-section';
import HowItWorksSection from '@/components/landing/how-it-works-section';

// Icons for feature cards
const JoinIcon = () => (
  <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const FindIcon = () => (
  <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
          {t.landing.title}
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          {t.landing.subtitle}
        </p>
      </section>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-8 pb-16">
        <Link
          href="/onboard"
          className="group block p-8 bg-bg-surface rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="mb-4">
            <JoinIcon />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            {t.landing.joinCard.title}
          </h2>
          <p className="text-text-secondary">
            {t.landing.joinCard.description}
          </p>
        </Link>

        <Link
          href="/request"
          className="group block p-8 bg-bg-surface rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="mb-4">
            <FindIcon />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            {t.landing.findCard.title}
          </h2>
          <p className="text-text-secondary">
            {t.landing.findCard.description}
          </p>
        </Link>
      </div>

      {/* About ABG Alumni Section */}
      <AboutAbgAlumniSection />

      {/* How It Works Section */}
      <HowItWorksSection />
    </div>
  );
}
