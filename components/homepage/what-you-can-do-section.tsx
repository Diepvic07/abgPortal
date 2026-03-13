import type { Translations } from '@/lib/i18n';

interface WhatYouCanDoSectionProps {
  whatYouCanDo: Translations['homepage']['whatYouCanDo'];
}

function SearchIcon() {
  return (
    <svg className="w-7 h-7 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg className="w-7 h-7 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  );
}

function NewspaperIcon() {
  return (
    <svg className="w-7 h-7 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg className="w-7 h-7 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

export function WhatYouCanDoSection({ whatYouCanDo }: WhatYouCanDoSectionProps) {
  const features = [
    { icon: <SearchIcon />, title: whatYouCanDo.searchTitle, desc: whatYouCanDo.searchDesc },
    { icon: <HandshakeIcon />, title: whatYouCanDo.introTitle, desc: whatYouCanDo.introDesc },
    { icon: <NewspaperIcon />, title: whatYouCanDo.updatesTitle, desc: whatYouCanDo.updatesDesc },
    { icon: <CrownIcon />, title: whatYouCanDo.premiumTitle, desc: whatYouCanDo.premiumDesc },
  ];

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-12">
          {whatYouCanDo.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex gap-4 p-6 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="shrink-0 mt-1">{f.icon}</div>
              <div>
                <h3 className="text-base font-semibold text-text-primary mb-1.5">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
