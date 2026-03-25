'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MemberOnboardingForm } from '@/components/forms/member-onboarding-form';
import { UpgradePremiumPrompt } from '@/components/upgrade-premium-prompt';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function OnboardPage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberStatus, setMemberStatus] = useState<'loading' | 'new' | 'basic' | 'premium'>('loading');

  useEffect(() => {
    async function checkMembership() {
      if (status === 'loading') return;

      if (!session?.user?.email) {
        setMemberStatus('new');
        return;
      }

      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.member?.id) {
            // Existing member - check if premium
            if (data.member.paid || data.member.payment_status === 'paid') {
              // Premium member - redirect to request page
              router.push('/request');
              return;
            }
            setMemberStatus('basic');
          } else {
            setMemberStatus('new');
          }
        } else {
          setMemberStatus('new');
        }
      } catch {
        setMemberStatus('new');
      }
    }

    checkMembership();
  }, [session, status, router]);

  if (status === 'loading' || memberStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  // Show upgrade prompt for existing basic members (not premium)
  if (memberStatus === 'basic') {
    return (
      <div className="max-w-2xl mx-auto">
        <UpgradePremiumPrompt />
      </div>
    );
  }

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
