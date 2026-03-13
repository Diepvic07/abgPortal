import type { Translations } from '@/lib/i18n';

interface WhatIsAbgSectionProps {
  whatIsAbg: Translations['homepage']['whatIsAbg'];
}

export function WhatIsAbgSection({ whatIsAbg }: WhatIsAbgSectionProps) {
  return (
    <section id="what-is-abg" className="py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6">
          {whatIsAbg.title}
        </h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          {whatIsAbg.description1}
        </p>
        <p className="text-text-secondary leading-relaxed">
          {whatIsAbg.description2}
        </p>
      </div>
    </section>
  );
}
