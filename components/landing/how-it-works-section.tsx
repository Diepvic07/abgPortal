'use client';

import { useTranslation } from '@/lib/i18n';

// Icons
const UserIcon = () => (
  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: 1,
      icon: UserIcon,
      title: t.landing.howItWorks.step1Title,
      description: t.landing.howItWorks.step1Desc,
    },
    {
      number: 2,
      icon: ChatIcon,
      title: t.landing.howItWorks.step2Title,
      description: t.landing.howItWorks.step2Desc,
    },
    {
      number: 3,
      icon: EmailIcon,
      title: t.landing.howItWorks.step3Title,
      description: t.landing.howItWorks.step3Desc,
    },
  ];

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            {t.landing.howItWorks.title}
          </h2>
          <p className="text-lg text-text-secondary">
            {t.landing.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gray-200 -z-10" />
              )}

              <div className="text-center">
                {/* Number badge */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand text-white font-bold text-xl mb-4">
                  {step.number}
                </div>

                {/* Icon in circle */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <step.icon />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-text-secondary">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
