import Link from 'next/link';
import { ScrollCtaButton } from './scroll-cta-button';
import type { Translations } from '@/lib/i18n';

interface HeroSectionProps {
  hero: Translations['homepage']['hero'];
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function HomepageHeroSection({ hero }: HeroSectionProps) {
  return (
    <section className="homepage-full-bleed bg-brand-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
          {hero.headline}
        </h1>
        <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10">
          {hero.subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/signup"
            className="px-8 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition-colors text-base"
          >
            {hero.primaryCta}
          </Link>
          <ScrollCtaButton
            targetId="what-is-abg"
            label={hero.secondaryCta}
            className="px-8 py-3.5 border border-white/30 text-white font-medium rounded-xl hover:bg-white/10 transition-colors text-base cursor-pointer"
          />
        </div>

        {/* Support bullets */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-blue-100">
          {[hero.bullet1, hero.bullet2, hero.bullet3].map((bullet, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckIcon />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
