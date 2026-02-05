'use client';

import { MemberOnboardingForm } from '@/components/forms/member-onboarding-form';
import { useTranslation } from '@/lib/i18n';

export default function OnboardPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t.onboard.title}
        </h2>
        <p className="text-gray-600">
          {t.onboard.subtitle}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <MemberOnboardingForm />
      </div>
    </div>
  );
}
