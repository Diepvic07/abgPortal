import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemberById, getMemberByEmail, getMemberByPublicProfileSlug, areMembersConnected } from '@/lib/supabase-db';
import { getReferenceByWriterAndRecipient } from '@/lib/member-references';
import { MemberProfileCard } from '@/components/ui/member-profile-card';
import { MemberReferenceComposer } from '@/components/profile/member-reference-composer';
import Link from 'next/link';
import { isEligibleForPremiumFeatures, type Member } from '@/types';
import { getInternalProfileUrl, isUuid } from '@/lib/profile-url';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Fuzzy fallback: when the identifier doesn't match any id or exact slug,
 * try progressively shorter prefixes of the identifier as a slug suffix.
 * Resolves legacy/garbage URLs like /profile/7RpZM4z where the true slug
 * ends in 7RpZM.
 */
async function findMemberByFuzzySuffix(identifier: string): Promise<Member | null> {
    if (identifier.length < 5) return null;
    const supabase = createServerSupabaseClient();
    const maxLen = Math.min(8, identifier.length);
    for (let len = maxLen; len >= 5; len--) {
        const prefix = identifier.slice(0, len);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('members') as any)
            .select('*')
            .like('public_profile_slug', `%-${prefix}`)
            .limit(2);
        const rows = (data || []) as Array<Record<string, unknown>>;
        if (rows.length === 1) {
            // Reuse the existing mapping by re-fetching via getMemberById so
            // we get a fully-typed Member with all derived fields.
            const id = rows[0].id as string;
            return await getMemberById(id);
        }
    }
    return null;
}

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { id: identifier } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect(`/login?callbackUrl=/profile/${identifier}`);
    }

    const [currentUser, directMatch] = await Promise.all([
        getMemberByEmail(session.user.email),
        isUuid(identifier) ? getMemberById(identifier) : getMemberByPublicProfileSlug(identifier),
    ]);

    // Fall back to fuzzy suffix resolution so legacy/garbage URLs still land.
    const targetMember = directMatch ?? (isUuid(identifier) ? null : await findMemberByFuzzySuffix(identifier));

    if (!currentUser || !targetMember) {
        notFound();
    }

    // Normalize the URL: UUID inputs redirect to the slug, and fuzzy matches
    // redirect to the canonical slug so the browser history reflects reality.
    if (isUuid(identifier) || targetMember.public_profile_slug !== identifier) {
        redirect(getInternalProfileUrl(targetMember));
    }

    // Check Authorization for viewing contact details.
    // Owner/admin always see; connected members see; premium members see as a
    // membership benefit. Basic members see the profile but not contact info.
    const isOwner = currentUser.id === targetMember.id;
    const isAdmin = currentUser.is_admin;
    const isConnected = isOwner || isAdmin ? false : await areMembersConnected(currentUser.id, targetMember.id);
    const isPremiumViewer = isEligibleForPremiumFeatures(currentUser);

    const isAuthorized = isOwner || isAdmin || isConnected || isPremiumViewer;
    let existingReference = null;
    // The composer is rendered for everyone — for the owner it becomes a
    // self-upgrade prompt (shown only if they're not premium yet); for other
    // viewers it's the write-a-reference form (or a vague unavailable message).
    let canLoadReferenceComposer = true;

    if (!isOwner) {
        try {
            existingReference = await getReferenceByWriterAndRecipient(currentUser.id, targetMember.id);
        } catch (error) {
            // Keep the core profile page available even if the optional references feature is unavailable.
            console.error('[ProfilePage] Failed to load reference composer state:', error);
            canLoadReferenceComposer = false;
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
                    Contact info is hidden. Upgrade to a premium membership or request an introduction to see contact details.
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
