'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';

interface EmailCheckCardProps {
  intent: 'signin' | 'signup';
  title: string;
  description: string;
  icon: React.ReactNode;
  onSwitchSection?: () => void;
}

interface CheckResult {
  exists: boolean;
  status: 'approved' | 'pending' | 'not_found';
  message: string;
  showOAuth: boolean;
}

export function EmailCheckCard({
  intent,
  title,
  description,
  icon,
  onSwitchSection,
}: EmailCheckCardProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCheckResult(null);

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), intent }),
      });

      if (!res.ok) {
        throw new Error('Failed to check email');
      }

      const data: CheckResult = await res.json();
      setCheckResult(data);
    } catch {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: intent === 'signup' ? '/onboard' : '/request' });
  };

  const handleReset = () => {
    setCheckResult(null);
    setError(null);
    setEmail('');
  };

  // Initial state - show email form
  if (!checkResult) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg shadow-lg">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary mb-4">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.onboard.form.emailPlaceholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t.common.loading : t.landing.emailCheck.checkButton}
          </button>
        </form>
      </div>
    );
  }

  // Result state
  return (
    <div className="bg-bg-surface p-6 rounded-lg shadow-lg">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>

      <p className="text-text-secondary mb-4">{checkResult.message}</p>

      {checkResult.showOAuth && (
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-3 transition-colors mb-3"
        >
          <GoogleIcon />
          <span className="font-medium text-gray-700">
            {t.landing.emailCheck.googleButton}
          </span>
        </button>
      )}

      {/* Show switch section link if user is in wrong section */}
      {!checkResult.showOAuth && checkResult.status !== 'pending' && (
        <button
          onClick={onSwitchSection}
          className="w-full py-3 text-brand font-medium hover:underline"
        >
          {intent === 'signin'
            ? t.landing.emailCheck.switchToSignup
            : t.landing.emailCheck.switchToSignin}
        </button>
      )}

      <button
        onClick={handleReset}
        className="w-full py-2 text-gray-500 text-sm hover:underline"
      >
        {t.landing.emailCheck.tryDifferentEmail}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
