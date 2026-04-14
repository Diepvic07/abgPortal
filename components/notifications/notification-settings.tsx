'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePushNotification } from '@/lib/hooks/usePushNotification';
import { useTranslation } from '@/lib/i18n';
import Image from 'next/image';

interface NotificationPreferences {
  connection_request: boolean;
  new_event: boolean;
  new_proposal: boolean;
  proposal_comment: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  connection_request: true,
  new_event: true,
  new_proposal: true,
  proposal_comment: true,
};

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function NotificationSettings() {
  const { permission, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotification();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  const platform = useMemo(() => detectPlatform(), []);
  const isPwa = useMemo(() => isStandalone(), []);
  const needsInstall = (platform === 'ios' || platform === 'android') && !isPwa;

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences);
        }
      } catch {
        // Use defaults
      }
      setPrefsLoading(false);
    }
    fetchPrefs();
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handlePrefToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    const updated = { ...preferences, [key]: newValue };
    setPreferences(updated);

    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
        showToast(t.notifications.saved);
      } else {
        // Revert on failure
        setPreferences(preferences);
      }
    } catch {
      setPreferences(preferences);
    }
    setSaving(false);
  };

  const isLoading = pushLoading || prefsLoading;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Push notification master toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.notifications.pushEnabled}</h3>
            <p className="text-sm text-gray-500 mt-1">{t.notifications.pushDescription}</p>
          </div>
          <button
            onClick={handlePushToggle}
            disabled={isLoading || permission === 'denied' || permission === 'unsupported'}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={isSubscribed}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isSubscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {permission === 'denied' && (
          <p className="mt-3 text-sm text-red-600">{t.notifications.pushDenied}</p>
        )}
        {permission === 'unsupported' && !needsInstall && (
          <p className="mt-3 text-sm text-amber-600">{t.notifications.pushUnsupported}</p>
        )}
        {permission === 'unsupported' && needsInstall && (
          <p className="mt-3 text-sm text-amber-600">{t.pushOnboarding.iosBannerDescription}</p>
        )}
      </div>

      {/* PWA Install Guide — shown when on mobile browser (not installed) */}
      {needsInstall && <PwaInstallGuide platform={platform} guideStep={guideStep} setGuideStep={setGuideStep} t={t} />}

      {/* Individual notification type toggles */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {!isSubscribed && (
          <div className="p-4 bg-gray-50 rounded-t-xl">
            <p className="text-sm text-gray-500">{t.notifications.enableFirst}</p>
          </div>
        )}

        <ToggleRow
          label={t.notifications.connectionRequest}
          description={t.notifications.connectionDescription}
          checked={preferences.connection_request}
          onChange={() => handlePrefToggle('connection_request')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.newEvent}
          description={t.notifications.eventDescription}
          checked={preferences.new_event}
          onChange={() => handlePrefToggle('new_event')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.newProposal}
          description={t.notifications.proposalDescription}
          checked={preferences.new_proposal}
          onChange={() => handlePrefToggle('new_proposal')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.proposalComment}
          description={t.notifications.commentDescription}
          checked={preferences.proposal_comment}
          onChange={() => handlePrefToggle('proposal_comment')}
          disabled={!isSubscribed || saving || isLoading}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PwaInstallGuide({ platform, guideStep, setGuideStep, t }: { platform: string; guideStep: number; setGuideStep: (v: number | ((s: number) => number)) => void; t: any }) {
  const steps = platform === 'ios'
    ? [
        { text: t.pushOnboarding.installGuideStep1iOS, image: '/images/pwa-guide/ios-step1.svg' },
        { text: t.pushOnboarding.installGuideStep2iOS, image: '/images/pwa-guide/ios-step2.svg' },
        { text: t.pushOnboarding.installGuideStep3iOS, image: '/images/pwa-guide/ios-step3.svg' },
      ]
    : [
        { text: t.pushOnboarding.installGuideStep1Android, image: '/images/pwa-guide/android-step1.svg' },
        { text: t.pushOnboarding.installGuideStep2Android, image: '/images/pwa-guide/android-step2.svg' },
        { text: t.pushOnboarding.installGuideStep3Android, image: '/images/pwa-guide/android-step3.svg' },
      ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">
          {t.pushOnboarding.installGuideTitle}
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {t.pushOnboarding.installGuideDescription}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {steps.map((_: unknown, i: number) => (
          <button
            key={i}
            onClick={() => setGuideStep(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === guideStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
            {guideStep + 1}
          </span>
          <p className="text-sm font-medium text-gray-900 pt-0.5">
            {steps[guideStep].text}
          </p>
        </div>
        <div className="relative w-full flex justify-center">
          <Image
            src={steps[guideStep].image}
            alt={`Step ${guideStep + 1}`}
            width={280}
            height={180}
            className="rounded-lg"
          />
        </div>
      </div>

      {/* After-install hint */}
      {guideStep === steps.length - 1 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            {t.pushOnboarding.iosAfterInstall}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => setGuideStep((s: number) => Math.max(0, s - 1))}
          disabled={guideStep === 0}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">
          {guideStep + 1} / {steps.length}
        </span>
        <button
          onClick={() => setGuideStep((s: number) => Math.min(steps.length - 1, s + 1))}
          disabled={guideStep === steps.length - 1}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
