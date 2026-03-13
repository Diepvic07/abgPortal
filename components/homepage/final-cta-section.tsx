import Link from 'next/link';
import type { Translations } from '@/lib/i18n';

interface FinalCtaSectionProps {
  finalCta: Translations['homepage']['finalCta'];
}

export function FinalCtaSection({ finalCta }: FinalCtaSectionProps) {
  return (
    <section className="homepage-full-bleed py-24 bg-blue-600 text-white text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
          {finalCta.headline}
        </h2>
        <p className="text-blue-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          {finalCta.subtext}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/signup"
            className="bg-white text-blue-600 px-10 py-5 rounded-xl text-xl font-bold hover:bg-blue-50 transition-colors shadow-2xl shadow-blue-900/40"
          >
            {finalCta.cta}
          </Link>
          <Link
            href="/faq"
            className="bg-blue-700/40 text-white backdrop-blur-md px-10 py-5 rounded-xl text-xl font-bold hover:bg-blue-700/60 transition-colors border border-blue-400/30"
          >
            {finalCta.secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
