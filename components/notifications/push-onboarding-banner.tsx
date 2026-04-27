'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePushNotification } from '@/lib/hooks/usePushNotification';
import { useTranslation } from '@/lib/i18n';
import Image from 'next/image';

const STORAGE_KEY = 'push-onboarding-dismissed';

type Step = 'banner' | 'preview' | 'questionnaire' | 'install-guide' | 'done';
type Platform = 'ios' | 'android' | 'desktop';

interface NotifToggle {
  key: string;
  enabled: boolean;
}

const DEFAULT_TOGGLES: NotifToggle[] = [
  { key: 'connection_request', enabled: true },
  { key: 'new_event', enabled: true },
  { key: 'new_proposal', enabled: true },
  { key: 'proposal_comment', enabled: true },
];

function detectPlatform(): Platform {
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

export function PushOnboardingBanner() {
  const { data: session } = useSession();
  const { permission, isSubscribed, subscribe, loading: pushLoading } = usePushNotification();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('banner');
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [toggles, setToggles] = useState<NotifToggle[]>(DEFAULT_TOGGLES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  const platform = useMemo(() => detectPlatform(), []);
  const isPwa = useMemo(() => isStandalone(), []);
  const isMobile = platform === 'ios' || platform === 'android';

  // iOS in Safari (not PWA) can't do push — needs install first
  const isIosSafari = platform === 'ios' && !isPwa;

  // Determine if banner should show
  useEffect(() => {
    if (pushLoading) return;
    if (!session?.user) return;
    if (isSubscribed) return;

    // On iOS Safari, push is "unsupported" — but we still want to show the install guide
    // On other platforms, skip if denied or unsupported
    if (!isIosSafari && (permission === 'denied' || permission === 'unsupported')) return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    setVisible(true);
  }, [session, isSubscribed, permission, pushLoading, isIosSafari]);

  const dismiss = useCallback(() => {
    setExiting(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleToggle = useCallback((key: string) => {
    setToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  const handleEnable = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const success = await subscribe();
    if (!success) {
      setSubmitting(false);
      // Check why it failed and show appropriate message
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        setError(t.pushOnboarding.permissionDenied);
      } else {
        setError(t.pushOnboarding.permissionFailed);
      }
      return;
    }

    // Save preferences
    const prefs: Record<string, boolean> = {};
    for (const toggle of toggles) {
      prefs[toggle.key] = toggle.enabled;
    }

    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch {
      // Preferences save failed but push is enabled — not critical
    }

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }

    setSubmitting(false);

    // On Android (not PWA), show install guide after enabling
    if (platform === 'android' && !isPwa) {
      setStep('install-guide');
    } else {
      setStep('done');
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => setVisible(false), 300);
      }, 2000);
    }
  }, [subscribe, toggles, platform, isPwa]);

  if (!visible) return null;

  const toggleLabel = (key: string) => {
    const labels: Record<string, { label: string; desc: string }> = {
      connection_request: { label: t.notifications.connectionRequest, desc: t.notifications.connectionDescription },
      new_event: { label: t.notifications.newEvent, desc: t.notifications.eventDescription },
      new_proposal: { label: t.notifications.newProposal, desc: t.notifications.proposalDescription },
      proposal_comment: { label: t.notifications.proposalComment, desc: t.notifications.commentDescription },
    };
    return labels[key] || { label: key, desc: '' };
  };

  const guideSteps = platform === 'ios'
    ? [
        { text: t.pushOnboarding.installGuideStep0iOS, image: '/images/pwa-guide/ios-step0-safari.svg' },
        { text: t.pushOnboarding.installGuideStep1iOS, image: '/images/pwa-guide/ios-step1.svg' },
        { text: t.pushOnboarding.installGuideStep2iOS, image: '/images/pwa-guide/ios-step2.svg' },
        { text: t.pushOnboarding.installGuideStep3iOS, image: '/images/pwa-guide/ios-step3.svg' },
        { text: t.pushOnboarding.installGuideStep4iOS, image: '/images/pwa-guide/ios-step4-open-pwa.svg' },
      ]
    : [
        { text: t.pushOnboarding.installGuideStep1Android, image: '/images/pwa-guide/android-step1.svg' },
        { text: t.pushOnboarding.installGuideStep2Android, image: '/images/pwa-guide/android-step2.svg' },
        { text: t.pushOnboarding.installGuideStep3Android, image: '/images/pwa-guide/android-step3.svg' },
        { text: t.pushOnboarding.installGuideStep4Android, image: '/images/pwa-guide/android-step4-open-pwa.svg' },
      ];

  const notiPreviewImage = platform === 'ios'
    ? '/images/pwa-guide/noti-preview-ios.svg'
    : '/images/pwa-guide/noti-preview-android.svg';

  // Always show preview first
  const handleSetup = () => {
    setStep('preview');
  };

  // After preview, go to install guide (iOS Safari) or questionnaire (others)
  const handleAfterPreview = () => {
    if (isIosSafari) {
      setStep('install-guide');
    } else {
      setStep('questionnaire');
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        exiting ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
      style={{ animation: exiting ? undefined : 'slideUp 0.4s ease-out' }}
    >
      <div className="mx-auto max-w-2xl px-4 pb-4">
        <div className="rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          {/* Step: Banner */}
          {step === 'banner' && (
            <div className="p-5 flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {isIosSafari ? (
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">
                  {isIosSafari ? t.pushOnboarding.iosBannerTitle : t.pushOnboarding.bannerTitle}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isIosSafari ? t.pushOnboarding.iosBannerDescription : t.pushOnboarding.bannerDescription}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={handleSetup}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isIosSafari ? t.pushOnboarding.iosSetupButton : t.pushOnboarding.setupButton}
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {t.pushOnboarding.skipButton}
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Step: Preview — show what notifications look like */}
          {step === 'preview' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {t.pushOnboarding.previewTitle}
                </h3>
                <button
                  onClick={dismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {t.pushOnboarding.previewDescription}
              </p>
              <div className="flex justify-center mb-4">
                <Image
                  src={notiPreviewImage}
                  alt="Push notification preview"
                  width={320}
                  height={200}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAfterPreview}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isIosSafari ? t.pushOnboarding.iosSetupButton : t.pushOnboarding.enableButton}
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2.5 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t.pushOnboarding.skipButton}
                </button>
              </div>
            </div>
          )}

          {/* Step: Questionnaire */}
          {step === 'questionnaire' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  {t.pushOnboarding.chooseTitle}
                </h3>
                <button
                  onClick={dismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1 mb-4">
                {toggles.map((toggle) => {
                  const { label, desc } = toggleLabel(toggle.key);
                  return (
                    <label
                      key={toggle.key}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={toggle.enabled}
                        onChange={() => handleToggle(toggle.key)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleEnable}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  ) : (
                    t.pushOnboarding.enableButton
                  )}
                </button>
                <button
                  onClick={dismiss}
                  disabled={submitting}
                  className="px-4 py-2.5 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t.pushOnboarding.skipButton}
                </button>
              </div>
            </div>
          )}

          {/* Step: Install Guide */}
          {step === 'install-guide' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t.pushOnboarding.installGuideTitle}
                  </h3>
                </div>
                <button
                  onClick={dismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {t.pushOnboarding.installGuideDescription}
              </p>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-4">
                {guideSteps.map((_, i) => (
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
                    {guideSteps[guideStep].text}
                  </p>
                </div>
                <div className="relative w-full flex justify-center">
                  <Image
                    src={guideSteps[guideStep].image}
                    alt={`Step ${guideStep + 1}`}
                    width={280}
                    height={180}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* After-install hint for iOS */}
              {isIosSafari && guideStep === guideSteps.length - 1 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    {t.pushOnboarding.iosAfterInstall}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setGuideStep((s) => Math.max(0, s - 1))}
                  disabled={guideStep === 0}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={dismiss}
                    className="px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {t.pushOnboarding.installGuideSkip}
                  </button>
                  {guideStep < guideSteps.length - 1 ? (
                    <button
                      onClick={() => setGuideStep((s) => s + 1)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={dismiss}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t.pushOnboarding.installGuideDone}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setGuideStep((s) => Math.min(guideSteps.length - 1, s + 1))}
                  disabled={guideStep === guideSteps.length - 1}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step: Success (desktop or already installed PWA) */}
          {step === 'done' && (
            <div className="p-5 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">
                {t.pushOnboarding.successMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
