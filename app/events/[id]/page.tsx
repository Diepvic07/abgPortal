import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EventDetail } from '@/components/events/event-detail';
import { PublicEventDetail } from '@/components/events/public-event-detail';
import { getPublicEventById } from '@/lib/supabase-events';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  return {
    title: `Event | ABG Alumni Connect`,
    description: 'View event details, RSVP, and join the discussion.',
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // If logged in, show full member experience
  if (session) {
    return <EventDetail eventId={id} />;
  }

  // Check if event is public — show guest view
  const publicEvent = await getPublicEventById(id);
  if (publicEvent) {
    return <PublicEventDetail eventId={id} />;
  }

  // Not logged in + not a public event → redirect to login
  const { redirect } = await import('next/navigation');
  redirect('/login');
}
