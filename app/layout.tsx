import type { Metadata } from 'next';
import { Inter, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';
import { LanguageProvider } from '@/lib/i18n';
import { HeaderNavigation } from '@/components/layout/header-navigation';
import { FooterSection } from '@/components/layout/footer-section';
import { AuthProvider } from '@/components/providers/auth-provider';
import { BugReportButton } from '@/components/ui/bug-report-button';
import { PostHogProvider } from '@/components/providers/posthog-provider';
import { PushNotificationProvider } from '@/components/providers/push-notification-provider';
import { PushOnboardingBanner } from '@/components/notifications/push-onboarding-banner';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-outfit',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'ABG Alumni Connect',
  description: 'Connect with fellow ABG Alumni members',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ABG Alumni" />
        <link rel="apple-touch-icon" href="/images/abg-icon-192.png" />
      </head>
      <body className={`${inter.className} ${beVietnamPro.variable}`}>
        <AuthProvider>
          <PostHogProvider>
            <LanguageProvider>
              <ToastProvider>
                <PushNotificationProvider>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                  <HeaderNavigation />
                  <main className="flex-1 max-w-4xl mx-auto px-4 pt-24 pb-8 w-full">
                    {children}
                  </main>
                  <FooterSection />
                </div>
                <BugReportButton />
                <PushOnboardingBanner />
                </PushNotificationProvider>
              </ToastProvider>
            </LanguageProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
