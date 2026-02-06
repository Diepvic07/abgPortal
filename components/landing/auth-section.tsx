'use client';

import { useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { EmailCheckCard } from './email-check-card';

// Icons
const ReturningIcon = () => (
  <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const JoinIcon = () => (
  <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

export function AuthSection() {
  const { t } = useTranslation();
  const signinRef = useRef<HTMLDivElement>(null);
  const signupRef = useRef<HTMLDivElement>(null);

  const scrollToSignin = () => {
    signinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div ref={signinRef}>
          <EmailCheckCard
            intent="signin"
            title={t.landing.authSection.returningTitle}
            description={t.landing.authSection.returningDesc}
            icon={<ReturningIcon />}
            onSwitchSection={scrollToSignup}
          />
        </div>
        <div ref={signupRef}>
          <EmailCheckCard
            intent="signup"
            title={t.landing.authSection.joinTitle}
            description={t.landing.authSection.joinDesc}
            icon={<JoinIcon />}
            onSwitchSection={scrollToSignin}
          />
        </div>
      </div>
    </section>
  );
}
