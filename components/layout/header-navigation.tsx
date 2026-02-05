'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcherDropdown } from '@/components/ui/language-switcher-dropdown';
import { HeaderUserMenu } from '@/components/ui/header-user-menu';
import { SignInButton } from '@/components/ui/sign-in-button';
import { getMembershipStatus, type Member } from '@/types';

// Header navigation with dark brand background and logo
export function HeaderNavigation() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);

  useEffect(() => {
    async function fetchMember() {
      if (session?.user?.email && !member) {
        setIsLoadingMember(true);
        try {
          const response = await fetch('/api/profile');
          if (response.ok) {
            const data = await response.json();
            setMember(data.member);
          }
        } catch (error) {
          console.error('Failed to fetch member:', error);
        } finally {
          setIsLoadingMember(false);
        }
      }
    }

    fetchMember();
  }, [session, member]);

  return (
    <header className="bg-brand shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Image
            src="/images/logo.png"
            alt="ABG Logo"
            width={36}
            height={36}
            className="h-9 w-auto"
          />
          <span className="text-xl font-semibold text-white">
            {t.nav.brand}
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/onboard" className="text-sm text-white/80 hover:text-white transition-colors">
            {t.nav.join}
          </Link>
          <Link href="/request" className="text-sm text-white/80 hover:text-white transition-colors">
            {t.nav.findConnection}
          </Link>
          <LanguageSwitcherDropdown />
          {status === 'authenticated' && member && !isLoadingMember ? (
            <HeaderUserMenu member={member} membershipStatus={getMembershipStatus(member)} />
          ) : status === 'unauthenticated' ? (
            <SignInButton variant="header" />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
