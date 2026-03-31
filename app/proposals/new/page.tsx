import type { Metadata } from 'next';
import { NewProposalForm } from '@/components/proposals/new-proposal-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New Proposal | ABG Alumni Connect',
  description: 'Propose a new community initiative.',
};

export default async function NewProposalPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <NewProposalForm />
    </div>
  );
}
