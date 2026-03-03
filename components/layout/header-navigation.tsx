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

// Header navigation with dark brand background and responsive mobile menu
export function HeaderNavigation() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleClickOutside = () => setIsMobileMenuOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-brand shadow-md relative">
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

        {/* Mobile hamburger button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileMenuOpen(!isMobileMenuOpen);
          }}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/onboard" className="text-sm text-white/80 hover:text-white transition-colors">
            {t.nav.join}
          </Link>
          <Link href="/request" className="text-sm text-white/80 hover:text-white transition-colors">
            {t.nav.findConnection}
          </Link>
          <Link href="/news" className="text-sm text-white/80 hover:text-white transition-colors">
            News
          </Link>
          <LanguageSwitcherDropdown />
          {status === 'authenticated' && member && !isLoadingMember ? (
            <HeaderUserMenu member={member} membershipStatus={getMembershipStatus(member)} />
          ) : status === 'unauthenticated' ? (
            <SignInButton variant="header" />
          ) : null}
        </nav>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 bg-brand border-t border-white/10 shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="flex flex-col p-4 gap-1">
            <Link
              href="/onboard"
              className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.nav.join}
            </Link>
            <Link
              href="/request"
              className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.nav.findConnection}
            </Link>
            <Link
              href="/news"
              className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              News
            </Link>
            <div className="px-4 py-3">
              <LanguageSwitcherDropdown />
            </div>
            <div className="px-4 py-3 border-t border-white/10 mt-2">
              {status === 'authenticated' && member && !isLoadingMember ? (
                <HeaderUserMenu member={member} membershipStatus={getMembershipStatus(member)} />
              ) : status === 'unauthenticated' ? (
                <SignInButton variant="header" />
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
