'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcherDropdown } from '@/components/ui/language-switcher-dropdown';
import { HeaderUserMenu } from '@/components/ui/header-user-menu';
import { SignInButton } from '@/components/ui/sign-in-button';
import { getMembershipStatus, getAvatarMemberStatus, type Member } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MembershipBadge } from '@/components/ui/membership-badge';
import { isAdmin } from '@/lib/admin-utils';
import { PaymentInfoModal } from '@/components/ui/payment-info-modal';

// Header navigation with dark brand background and responsive mobile menu
export function HeaderNavigation() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobilePaymentModalOpen, setIsMobilePaymentModalOpen] = useState(false);

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

  const handleMobileSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Compute mobile-specific membership values
  const membershipStatus = member ? getMembershipStatus(member) : null;
  const isPendingPayment = membershipStatus === 'pending';
  const showPaymentCta = membershipStatus && (membershipStatus === 'basic' || membershipStatus === 'expired') && !isPendingPayment;

  return (
    <>
      <header className="bg-brand shadow-md relative">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/images/abg_dark_logo.png"
              alt="ABG Logo"
              width={269}
              height={103}
              className="h-9 w-auto object-contain"
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
            {status !== 'authenticated' && (
              <Link href="/onboard" className="text-sm text-white/80 hover:text-white transition-colors">
                {t.nav.join}
              </Link>
            )}
            <Link href="/request" className="text-sm text-white/80 hover:text-white transition-colors">
              {t.nav.findConnection}
            </Link>
            {status === 'authenticated' && (
              <Link href="/members" className="text-sm text-white/80 hover:text-white transition-colors">
                Members
              </Link>
            )}
            <Link href="/news" className="text-sm text-white/80 hover:text-white transition-colors">
              News
            </Link>
            <Link href="/faq" className="text-sm text-white/80 hover:text-white transition-colors">
              {t.nav.faq}
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
              {status !== 'authenticated' && (
                <Link
                  href="/onboard"
                  className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.nav.join}
                </Link>
              )}
              <Link
                href="/request"
                className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.nav.findConnection}
              </Link>
              {status === 'authenticated' && (
                <Link
                  href="/members"
                  className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Members
                </Link>
              )}
              <Link
                href="/news"
                className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                News
              </Link>
              <Link
                href="/faq"
                className="text-sm text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.nav.faq}
              </Link>
              <div className="px-4 py-3">
                <LanguageSwitcherDropdown />
              </div>

              {/* Mobile user section - inline links instead of nested dropdown */}
              <div className="border-t border-white/10 mt-2 pt-3">
                {status === 'authenticated' && member && !isLoadingMember ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                      <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="sm" memberStatus={getAvatarMemberStatus(member)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.name}</p>
                        <p className="text-xs text-white/60 truncate">{member.email}</p>
                      </div>
                      {membershipStatus && <MembershipBadge status={membershipStatus} size="sm" />}
                    </div>

                    {/* Payment CTA */}
                    {showPaymentCta && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsMobilePaymentModalOpen(true);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-amber-300 hover:bg-white/10 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        {t.payment.completePayment}
                      </button>
                    )}
                    {isPendingPayment && (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-blue-300">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t.payment.paymentUnderReview}
                      </div>
                    )}

                    {/* Profile link */}
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t.nav.profile}
                    </Link>

                    {/* History link */}
                    <Link
                      href="/history"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t.nav.history}
                    </Link>

                    {/* Admin link */}
                    {isAdmin(member) && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-3 text-sm text-purple-300 hover:text-purple-200 hover:bg-white/10 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin
                      </Link>
                    )}

                    {/* Sign out */}
                    <button
                      onClick={handleMobileSignOut}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md transition-colors mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t.auth.signOut}
                    </button>
                  </>
                ) : status === 'unauthenticated' ? (
                  <div className="px-4 py-3">
                    <SignInButton variant="header" />
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Mobile payment modal - rendered outside header to avoid z-index issues */}
      {member && showPaymentCta && (
        <PaymentInfoModal
          memberId={member.id}
          memberName={member.name}
          isOpen={isMobilePaymentModalOpen}
          onClose={() => setIsMobilePaymentModalOpen(false)}
        />
      )}
    </>
  );
}
