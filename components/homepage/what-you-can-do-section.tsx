import type { Translations } from '@/lib/i18n';

interface WhatYouCanDoSectionProps {
  whatYouCanDo: Translations['homepage']['whatYouCanDo'];
}

export function WhatYouCanDoSection({ whatYouCanDo }: WhatYouCanDoSectionProps) {
  const features = [
    { label: whatYouCanDo.searchLabel, title: whatYouCanDo.searchTitle, desc: whatYouCanDo.searchDesc },
    { label: whatYouCanDo.introLabel, title: whatYouCanDo.introTitle, desc: whatYouCanDo.introDesc },
    { label: whatYouCanDo.updatesLabel, title: whatYouCanDo.updatesTitle, desc: whatYouCanDo.updatesDesc },
    { label: whatYouCanDo.premiumLabel, title: whatYouCanDo.premiumTitle, desc: whatYouCanDo.premiumDesc },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-16">
          {/* LEFT: 2x2 grid */}
          <div className="flex-1 order-2 md:order-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`premium-card p-6 rounded-2xl bg-slate-50/50 ${i === 3 ? 'ring-2 ring-blue-600/20' : ''}`}
                >
                  <div className="text-brand-light font-bold text-sm mb-2 uppercase tracking-wide">
                    {f.label}
                  </div>
                  <h4 className="font-bold mb-2">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: title + paragraphs */}
          <div className="flex-1 order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              {whatYouCanDo.title}
            </h2>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              <p>{whatYouCanDo.description1}</p>
              <p>{whatYouCanDo.description2}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
