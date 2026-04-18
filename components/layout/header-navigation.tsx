'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcherDropdown } from '@/components/ui/language-switcher-dropdown';
import { HeaderUserMenu } from '@/components/ui/header-user-menu';
import { getMembershipStatus, getAvatarMemberStatus, type Member } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { MembershipBadge } from '@/components/ui/membership-badge';
import { isAdmin } from '@/lib/admin-utils';
import { PaymentInfoModal } from '@/components/ui/payment-info-modal';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function HeaderNavigation() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobilePaymentModalOpen, setIsMobilePaymentModalOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          mobileMenuRef.current?.contains(target) ||
          hamburgerRef.current?.contains(target)
        ) return;
        setIsMobileMenuOpen(false);
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  const handleMobileSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const membershipStatus = member ? getMembershipStatus(member) : null;
  const isPendingPayment = membershipStatus === 'pending';
  const showPaymentCta = membershipStatus && (membershipStatus === 'basic' || membershipStatus === 'expired') && !isPendingPayment;

  return (
    <>
      <header className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/images/abg_white_logo.png"
              alt="ABG Logo"
              width={269}
              height={103}
              className="h-9 w-auto object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              ABG <span className="text-white">Alumni</span>
            </span>
          </Link>

          {/* Mobile notification bell + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            {status === 'authenticated' && <NotificationBell />}
            <button
              ref={hamburgerRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="p-2 text-white/80 hover:text-white rounded-md transition-colors"
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
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {status !== 'authenticated' && (
              <Link href="/onboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                {t.nav.join}
              </Link>
            )}
            <Link
              href="/request"
              onClick={(e) => {
                if (pathname === '/request') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  router.refresh();
                }
              }}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {t.nav.findConnection}
            </Link>
            <Link href="/events" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              {t.nav.events || 'Events'}
            </Link>
            {status === 'authenticated' && (
              <>
                <Link href="/members" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  {t.nav.members}
                </Link>
                <Link href="/profile" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  {t.nav.profile || 'Profile'}
                </Link>
                <Link href="/members/leaderboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  {t.nav.leaderboard || 'Leaderboard'}
                </Link>
              </>
            )}
            <Link href="/news" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              {t.nav.news}
            </Link>
            <Link href="/faq" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              {t.nav.faq}
            </Link>
            <LanguageSwitcherDropdown />
            {status === 'authenticated' && <NotificationBell />}
            <div className="h-6 w-px bg-white/20 mx-2" />
            {status === 'authenticated' ? (
              member && !isLoadingMember ? (
                <HeaderUserMenu member={member} membershipStatus={getMembershipStatus(member)} />
              ) : isLoadingMember ? (
                <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
              ) : (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
                  title={t.auth.signOut}
                >
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {t.auth.signOut}
                </button>
              )
            ) : status === 'unauthenticated' ? (
              <>
                <Link href="/login" className="text-white text-sm font-semibold hover:text-blue-200 transition-colors">
                  {t.auth.signIn || 'Sign In'}
                </Link>
                <Link href="/signup" className="bg-white text-brand px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-50 transition-colors">
                  {t.homepage?.hero?.primaryCta || 'Unlock Member Access'}
                </Link>
              </>
            ) : null}
          </nav>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden absolute top-full left-0 right-0 bg-brand-dark border-t border-white/10 shadow-lg z-50"
          >
            <nav className="flex flex-col p-4 gap-1">
              {status !== 'authenticated' && (
                <Link
                  href="/onboard"
                  className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t.nav.join}
                </Link>
              )}
              <Link
                href="/request"
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (pathname === '/request') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    router.refresh();
                  }
                }}
              >
                {t.nav.findConnection}
              </Link>
              <Link
                href="/events"
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.nav.events || 'Events'}
              </Link>
              {status === 'authenticated' && (
                <>
                  <Link
                    href="/members"
                    className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.nav.members}
                  </Link>
                  <Link
                    href="/profile"
                    className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.nav.profile || 'Profile'}
                  </Link>
                  <Link
                    href="/members/leaderboard"
                    className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.nav.leaderboard || 'Leaderboard'}
                  </Link>
                </>
              )}
              <Link
                href="/news"
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.nav.news}
              </Link>
              <Link
                href="/faq"
                className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.nav.faq}
              </Link>
              <div className="px-4 py-3">
                <LanguageSwitcherDropdown />
              </div>

              {/* Mobile user section */}
              <div className="border-t border-white/10 mt-2 pt-3">
                {status === 'authenticated' ? (
                  member && !isLoadingMember ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size="sm" memberStatus={getAvatarMemberStatus(member)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-white/50 truncate">{member.email}</p>
                        </div>
                        {membershipStatus && <MembershipBadge status={membershipStatus} size="sm" />}
                      </div>

                      {showPaymentCta && (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsMobilePaymentModalOpen(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-white/10 rounded-md transition-colors"
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

                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t.nav.profile}
                      </Link>

                      <Link
                        href="/profile/notifications"
                        className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {t.notifications?.title || 'Notifications'}
                      </Link>

                      <Link
                        href="/history"
                        className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t.nav.history}
                      </Link>

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
                  ) : isLoadingMember ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
                          <div className="h-2 w-32 bg-white/10 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <div className="flex items-center gap-3 mb-3">
                        {session?.user?.image ? (
                          <Image src={session.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{session?.user?.name || session?.user?.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleMobileSignOut}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t.auth.signOut}
                      </button>
                    </div>
                  )
                ) : status === 'unauthenticated' ? (
                  <div className="px-4 py-3 flex flex-col gap-3">
                    <Link href="/login" className="text-white text-sm font-semibold hover:text-blue-200 transition-colors">
                      {t.auth.signIn || 'Sign In'}
                    </Link>
                    <Link href="/signup" className="bg-white text-brand px-6 py-2.5 rounded-full text-sm font-semibold text-center hover:bg-blue-50 transition-colors">
                      {t.homepage?.hero?.primaryCta || 'Unlock Member Access'}
                    </Link>
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        )}
      </header>

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
