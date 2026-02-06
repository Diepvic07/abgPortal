'use client';

import { useTranslation } from '@/lib/i18n';
import { PublicSearchSection } from '@/components/landing/public-search-section';
import { AuthSection } from '@/components/landing/auth-section';
import AboutAbgAlumniSection from '@/components/landing/about-abg-alumni-section';
import HowItWorksSection from '@/components/landing/how-it-works-section';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
          {t.landing.title}
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          {t.landing.subtitle}
        </p>
      </section>

      {/* Public Search Preview Section */}
      <PublicSearchSection />

      {/* Divider */}
      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-bg-primary text-text-secondary text-sm font-medium">
            {t.landing.divider}
          </span>
        </div>
      </div>

      {/* Auth Section - Returning Member + Join Community */}
      <div id="auth-section">
        <AuthSection />
      </div>

      {/* About ABG Alumni Section */}
      <AboutAbgAlumniSection />

      {/* How It Works Section */}
      <HowItWorksSection />
    </div>
  );
}
