import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PublicProposals } from '@/components/proposals/public-proposals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'What ABG Alumni Are Building | ABG Alumni Connect',
  description: 'See what the ABG alumni community is building together. Join us!',
};

export default async function CommunityPage() {
  const session = await getServerSession(authOptions);

  // Logged-in members go to the full proposals list
  if (session) {
    redirect('/proposals');
  }

  return (
    <div className="min-h-screen">
      <PublicProposals />
    </div>
  );
}
