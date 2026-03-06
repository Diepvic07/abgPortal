import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';
import { LanguageProvider } from '@/lib/i18n';
import { HeaderNavigation } from '@/components/layout/header-navigation';
import { FooterSection } from '@/components/layout/footer-section';
import { AuthProvider } from '@/components/providers/auth-provider';
import { BugReportButton } from '@/components/ui/bug-report-button';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ABG Alumni Connect',
  description: 'Connect with fellow ABG Alumni members',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <HeaderNavigation />
                <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
                  {children}
                </main>
                <FooterSection />
              </div>
              <BugReportButton />
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
