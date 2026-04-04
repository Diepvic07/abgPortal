import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemberById, getMemberByEmail, areMembersConnected } from '@/lib/supabase-db';
import { getReferenceByWriterAndRecipient } from '@/lib/member-references';
import { MemberProfileCard } from '@/components/ui/member-profile-card';
import { MemberReferenceComposer } from '@/components/profile/member-reference-composer';
import Link from 'next/link';
import { isEligibleForPremiumFeatures } from '@/types';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect(`/login?callbackUrl=/profile/${id}`);
    }

    const [currentUser, targetMember] = await Promise.all([
        getMemberByEmail(session.user.email),
        getMemberById(id),
    ]);

    if (!currentUser || !targetMember) {
        notFound();
    }

    // Check Authorization
    const isOwner = currentUser.id === targetMember.id;
    const isAdmin = currentUser.is_admin;
    const isConnected = isOwner || isAdmin ? false : await areMembersConnected(currentUser.id, targetMember.id);

    const isAuthorized = isOwner || isAdmin || isConnected;
    let existingReference = null;
    let canLoadReferenceComposer = false;

    if (!isOwner) {
        try {
            existingReference = await getReferenceByWriterAndRecipient(currentUser.id, targetMember.id);
            canLoadReferenceComposer = true;
        } catch (error) {
            // Keep the core profile page available even if the optional references feature is unavailable.
            console.error('[ProfilePage] Failed to load reference composer state:', error);
        }
    }

    // Strip contact info for non-connected viewers
    const visibleMember = isAuthorized
        ? targetMember
        : { ...targetMember, email: '', phone: '', linkedin_url: '', facebook_url: '', company_website: '' };

    return (
        <div className="min-h-screen bg-[#f4f4f7] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center">
                <Link
                    href="/members"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </Link>
            </div>
            <MemberProfileCard member={visibleMember} />
            {!isAuthorized && (
                <div className="max-w-3xl mx-auto mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-sm text-amber-700">
                    Contact info is hidden. Request an introduction to connect with this member.
                </div>
            )}
            {canLoadReferenceComposer && (
                <MemberReferenceComposer
                    recipientId={targetMember.id}
                    recipientName={targetMember.name}
                    writerEligible={isEligibleForPremiumFeatures(currentUser)}
                    recipientEligible={isEligibleForPremiumFeatures(targetMember)}
                    isSelf={isOwner}
                    existingReference={existingReference}
                />
            )}
        </div>
    );
}
