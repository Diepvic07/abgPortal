import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ProposalsList } from '@/components/proposals/proposals-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community Proposals | ABG Alumni Connect',
  description: 'Propose ideas, commit to action, and build together as ABG alumni.',
};

export default async function ProposalsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ProposalsList />
    </div>
  );
}
