import type { Translations } from '@/lib/i18n';

interface HowItWorksSectionProps {
  howItWorks: Translations['homepage']['howItWorks'];
}

export function HomepageHowItWorksSection({ howItWorks }: HowItWorksSectionProps) {
  const steps = [
    { num: '01', title: howItWorks.step1Title, desc: howItWorks.step1Desc },
    { num: '02', title: howItWorks.step2Title, desc: howItWorks.step2Desc },
    { num: '03', title: howItWorks.step3Title, desc: howItWorks.step3Desc },
  ];

  return (
    <section className="homepage-full-bleed py-24 bg-slate-900 text-white overflow-hidden relative">
      {/* Decorative skewed shape */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 skew-x-12 transform translate-x-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {howItWorks.title}
          </h2>
          <p className="text-blue-400 text-lg">{howItWorks.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              <div className="step-number text-7xl font-extrabold mb-6 opacity-80 group-hover:opacity-100 transition-opacity">
                {step.num}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                {step.desc}
              </p>
              {/* Connector line (desktop, not last) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-6 w-12 h-px bg-slate-800" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
