import Link from 'next/link';
import { ScrollCtaButton } from './scroll-cta-button';
import { HeroNetworkVisualization } from './hero-network-visualization';
import type { Translations } from '@/lib/i18n';
import type { FeaturedMember } from '@/lib/homepage-stats';

interface HeroSectionProps {
  hero: Translations['homepage']['hero'];
  featuredMembers: FeaturedMember[];
  alumniCount: number;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function HomepageHeroSection({ hero, featuredMembers, alumniCount }: HeroSectionProps) {
  return (
    <section className="homepage-full-bleed relative pt-8 pb-20 md:pt-16 md:pb-32 overflow-hidden hero-gradient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          {/* Left content */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-6 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-brand-light animate-pulse" />
              <span className="text-xs font-bold text-brand-light uppercase tracking-widest">
                {hero.badge}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6 animate-fade-in-up delay-100">
              {hero.headline}
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl animate-fade-in-up delay-200 leading-relaxed">
              {hero.subheadline}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up delay-300">
              <Link href="/signup" className="btn-primary px-8 py-4 rounded-xl text-lg font-bold text-center">
                {hero.primaryCta}
              </Link>
              <ScrollCtaButton
                targetId="what-is-abg"
                label={hero.secondaryCta}
                className="btn-secondary px-8 py-4 rounded-xl text-lg font-bold cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 animate-fade-in-up delay-300">
              {[hero.bullet1, hero.bullet2, hero.bullet3].map((bullet, i) => (
                <div key={i} className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-600 transition-colors">
                    <CheckIcon className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-slate-600 font-medium">{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side: network visualization */}
          <HeroNetworkVisualization members={featuredMembers} alumniCount={alumniCount} />
        </div>
      </div>
    </section>
  );
}
