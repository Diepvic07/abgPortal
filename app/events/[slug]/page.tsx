import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EventDetail } from '@/components/events/event-detail';
import { PublicEventDetail } from '@/components/events/public-event-detail';
import { getEventBySlug, getPublicEventBySlug } from '@/lib/supabase-events';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  return {
    title: `Event | ABG Alumni Connect`,
    description: 'View event details, RSVP, and join the discussion.',
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);
  const { slug } = await params;

  // Look up the event by slug to get the actual ID for components
  if (session) {
    const event = await getEventBySlug(slug);
    if (!event) {
      const { redirect } = await import('next/navigation');
      return redirect('/events');
    }
    return <EventDetail eventId={event!.id} />;
  }

  // Check if event is public — show guest view
  const publicEvent = await getPublicEventBySlug(slug);
  if (publicEvent) {
    return <PublicEventDetail eventId={publicEvent.id} />;
  }

  // Not logged in + not a public event → redirect to login
  const { redirect } = await import('next/navigation');
  redirect('/login');
}
