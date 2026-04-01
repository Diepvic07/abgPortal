import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { EventDetail } from '@/components/events/event-detail';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Event | ABG Alumni Connect`,
    description: 'View event details, RSVP, and join the discussion.',
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  return <EventDetail eventId={id} />;
}
