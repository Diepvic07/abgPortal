import type { Metadata } from 'next';
import { PublicProposals } from '@/components/proposals/public-proposals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'What ABG Alumni Are Building | ABG Alumni Connect',
  description: 'See what the ABG alumni community is building together. Join us!',
};

export default async function CommunityPage() {
  return (
    <div className="min-h-screen">
      <PublicProposals />
    </div>
  );
}
