import type { Metadata } from 'next';
import { ProposalDetail } from '@/components/proposals/proposal-detail';
import { getProposalById, getProposalBySlug } from '@/lib/supabase-community';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveProposal(slugOrId: string) {
  const bySlug = await getProposalBySlug(slugOrId);
  if (bySlug) return bySlug;

  if (UUID_REGEX.test(slugOrId)) {
    return getProposalById(slugOrId);
  }

  return null;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const proposal = await resolveProposal(slug);

  if (!proposal) {
    return { title: 'Proposal | ABG Alumni Connect' };
  }

  const description = proposal.description.replace(/\s+/g, ' ').slice(0, 160);

  return {
    title: `${proposal.title} | ABG Alumni Connect`,
    description,
    openGraph: {
      title: proposal.title,
      description,
      ...(proposal.image_url && {
        images: [{ url: proposal.image_url, width: 1200, height: 630, alt: proposal.title }],
      }),
    },
  };
}

export default async function ProposalDetailPage({ params }: Props) {
  const { slug } = await params;
  const proposal = await resolveProposal(slug);

  // Redirect old UUID URLs to slug
  if (proposal && UUID_REGEX.test(slug)) {
    const { redirect } = await import('next/navigation');
    return redirect(`/proposals/${proposal.slug}`);
  }

  if (!proposal) {
    const { redirect } = await import('next/navigation');
    return redirect('/events?tab=proposals');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProposalDetail proposalId={proposal.id} />
    </div>
  );
}
