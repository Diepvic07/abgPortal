import Link from 'next/link';
import type { Translations } from '@/lib/i18n';

interface FinalCtaSectionProps {
  finalCta: Translations['homepage']['finalCta'];
}

export function FinalCtaSection({ finalCta }: FinalCtaSectionProps) {
  return (
    <section className="homepage-full-bleed bg-brand-dark text-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          {finalCta.headline}
        </h2>
        <p className="text-blue-200 mb-8 text-lg">
          {finalCta.subtext}
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-3.5 bg-white text-brand font-semibold rounded-xl hover:bg-gray-100 transition-colors text-base"
        >
          {finalCta.cta}
        </Link>
      </div>
    </section>
  );
}
