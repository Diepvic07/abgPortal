import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemberById, getMemberByEmail, areMembersConnected } from '@/lib/supabase-db';
import { MemberProfileCard } from '@/components/ui/member-profile-card';
import Link from 'next/link';

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

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col items-center text-center p-8">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Private Profile</h2>
                    <p className="text-gray-500 mb-8">
                        You must be connected with this member to view their full profile details.
                    </p>
                    <Link
                        href="/history"
                        className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-dark transition-all shadow-md hover:shadow-lg"
                    >
                        Go back to History
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f4f7] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center">
                <Link
                    href="/history"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </Link>
            </div>
            <MemberProfileCard member={targetMember} />
        </div>
    );
}
