'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface SignInButtonProps {
    className?: string;
    variant?: 'default' | 'header';
}

export function SignInButton({ className = '', variant = 'default' }: SignInButtonProps) {
    const { t, locale } = useTranslation();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: '/request' });
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json();

            if (!data.exists) {
                router.push(`/signup?email=${encodeURIComponent(email)}`);
                return;
            }
            if (data.status === 'pending') { router.push('/auth/pending'); return; }
            if (data.status === 'rejected') { router.push('/auth/rejected'); return; }
            if (data.accountStatus === 'suspended' || data.accountStatus === 'banned') {
                router.push('/auth/suspended'); return;
            }

            if (data.isTestMode && !data.adminEmails.includes(email.trim().toLowerCase())) {
                setError(locale === 'vi'
                    ? 'Resend đang ở chế độ test. Chỉ gửi được đến email admin. Hãy dùng Google Sign-In.'
                    : 'System is in test mode. Cannot send email to this address. Please use Google Sign-In.');
                setIsLoading(false);
                return;
            }

            const result = await signIn('email', { email, redirect: false, callbackUrl: '/request' });
            if (result?.error) {
                console.error('Magic link sign-in error:', result.error);
                const friendlyError = result.error === 'EmailSignin'
                    ? (locale === 'vi'
                        ? 'Không thể gửi magic link. Hãy thử đăng nhập bằng Google.'
                        : 'Could not send magic link. Please try Google Sign-In instead.')
                    : (locale === 'vi' ? `Không thể gửi email. Chi tiết: ${result.error}` : `Could not send email. Details: ${result.error}`);
                setError(friendlyError);
            } else {
                setEmailSent(true);
            }
        } catch (err) {
            console.error('Magic link exception:', err);
            setError(locale === 'vi' ? `Có lỗi xảy ra: ${err instanceof Error ? err.message : 'Unknown'}` : `Something went wrong: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'header') {
        const headerClass = `text-sm text-white/80 hover:text-white transition-colors ${className}`;
        return (
            <button onClick={() => router.push('/login')} className={headerClass}>
                {t.auth.signIn}
            </button>
        );
    }

    if (emailSent) {
        return (
            <p className="text-center text-sm text-green-600 font-medium py-2">
                {locale === 'vi' ? 'Đã gửi magic link! Kiểm tra email của bạn.' : 'Magic link sent! Check your email.'}
            </p>
        );
    }

    return (
        <div className={`space-y-3 w-full max-w-sm ${className}`}>
            {/* Email magic link */}
            <form onSubmit={handleEmailSignIn} className="space-y-2">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={locale === 'vi' ? 'Nhập email của bạn' : 'Enter your email'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                />
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                    {isLoading
                        ? (locale === 'vi' ? 'Đang kiểm tra...' : 'Checking...')
                        : (locale === 'vi' ? 'Đăng nhập bằng Email' : 'Sign in with Email')}
                </button>
            </form>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">
                        {locale === 'vi' ? 'hoặc' : 'or'}
                    </span>
                </div>
            </div>

            {/* Google */}
            <button
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-medium text-gray-700">
                    {t.auth.signInWith.replace('{provider}', 'Google')}
                </span>
            </button>
        </div>
    );
}
