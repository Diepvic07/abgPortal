'use client';

import { LoginForm } from "@/components/forms/login-form";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const ERROR_KEYS: Record<string, keyof typeof import('@/lib/i18n/translations/en').en.auth> = {
  OAuthCallback: 'oauthCallbackError',
  OAuthSignin: 'oauthSigninError',
  OAuthAccountNotLinked: 'oauthAccountNotLinked',
  SessionRequired: 'sessionRequired',
};

export function LoginPageClient({ errorCode }: { errorCode?: string }) {
  const { t } = useTranslation();

  const errorMessage = errorCode
    ? t.auth[ERROR_KEYS[errorCode] || 'defaultError' as keyof typeof t.auth] || t.auth.defaultError
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-gray-900">ABG Alumni Connect</h1>
          </Link>
          <p className="text-gray-600 mt-2">{t.auth.loginSubtitle}</p>
        </div>
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <LoginForm />
        <p className="text-center text-sm text-gray-500 mt-6">
          {t.auth.notMemberYet}{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            {t.auth.applyToJoin}
          </Link>
        </p>
      </div>
    </div>
  );
}
