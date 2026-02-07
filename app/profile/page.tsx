import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemberByEmail } from '@/lib/google-sheets';
import { getMembershipStatus } from '@/types';
import { ProfileViewDisplay } from '@/components/profile/profile-view-display';
import { ProfileEditFormComponent } from '@/components/profile/profile-edit-form-component';

interface ProfilePageProps {
  searchParams: Promise<{
    edit?: string;
  }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/');
  }

  const member = await getMemberByEmail(session.user.email);

  if (!member) {
    redirect('/onboard');
  }

  // Check if member has completed profile (required fields)
  if (!member.role || !member.company || !member.expertise) {
    redirect('/onboard');
  }

  const membershipStatus = getMembershipStatus(member);
  const resolvedSearchParams = await searchParams;
  const isEditMode = resolvedSearchParams.edit === 'true';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {isEditMode ? (
        <ProfileEditFormComponent member={member} />
      ) : (
        <ProfileViewDisplay member={member} membershipStatus={membershipStatus} />
      )}
    </div>
  );
}
