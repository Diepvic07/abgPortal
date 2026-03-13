import Link from 'next/link';
import type { Translations } from '@/lib/i18n';

interface WhatIsAbgSectionProps {
  whatIsAbg: Translations['homepage']['whatIsAbg'];
}

export function WhatIsAbgSection({ whatIsAbg }: WhatIsAbgSectionProps) {
  return (
    <section id="what-is-abg" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
          {whatIsAbg.title}
        </h2>
        <div className="space-y-6 text-lg md:text-xl text-slate-600 leading-relaxed font-light">
          <p>{whatIsAbg.description1}</p>
          <p>{whatIsAbg.description2}</p>
        </div>
        <div className="mt-10">
          <Link href="/about" className="text-blue-600 font-bold flex items-center justify-center group">
            {whatIsAbg.missionLink}
            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
