import type { Metadata } from 'next';
import { ProposalDetail } from '@/components/proposals/proposal-detail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Proposal | ABG Alumni Connect`,
  };
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProposalDetail proposalId={id} />
    </div>
  );
}
