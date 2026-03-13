import type { Translations } from '@/lib/i18n';

interface HowItWorksSectionProps {
  howItWorks: Translations['homepage']['howItWorks'];
}

export function HomepageHowItWorksSection({ howItWorks }: HowItWorksSectionProps) {
  const steps = [
    { num: '1', title: howItWorks.step1Title, desc: howItWorks.step1Desc },
    { num: '2', title: howItWorks.step2Title, desc: howItWorks.step2Desc },
    { num: '3', title: howItWorks.step3Title, desc: howItWorks.step3Desc },
  ];

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
          {howItWorks.title}
        </h2>
        <p className="text-text-secondary mb-12">{howItWorks.subtitle}</p>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8 md:gap-12">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center flex-1 relative">
              {/* Connector line (desktop only, not on last) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-2rem)] h-px bg-brand-light/30" />
              )}
              <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-lg font-bold mb-4 relative z-10">
                {step.num}
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
