import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EventDetail } from '@/components/events/event-detail';
import { PublicEventDetail } from '@/components/events/public-event-detail';
import { getEventById, getEventBySlug } from '@/lib/supabase-events';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveEvent(slugOrId: string) {
  // Try slug first
  const bySlug = await getEventBySlug(slugOrId);
  if (bySlug) return bySlug;

  // Fallback: if it looks like a UUID, try by ID (old links)
  if (UUID_REGEX.test(slugOrId)) {
    return getEventById(slugOrId);
  }

  return null;
}

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await resolveEvent(slug);

  if (!event) {
    return {
      title: 'Event | ABG Alumni Connect',
      description: 'View event details, RSVP, and join the discussion.',
    };
  }

  const description = event.description.replace(/\s+/g, ' ').slice(0, 160);

  return {
    title: `${event.title} | ABG Alumni Connect`,
    description,
    openGraph: {
      title: event.title,
      description,
      ...(event.image_url && { images: [{ url: event.image_url }] }),
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);
  const { slug } = await params;

  const event = await resolveEvent(slug);

  // Redirect old UUID URLs to the new slug URL
  if (event && UUID_REGEX.test(slug)) {
    const { redirect } = await import('next/navigation');
    return redirect(`/events/${event.slug}`);
  }

  if (!event) {
    const { redirect } = await import('next/navigation');
    return redirect('/events');
  }

  if (session) {
    return <EventDetail eventId={event.id} />;
  }

  // Visitor: show public detail for any published event
  if (event.status === 'published') {
    return <PublicEventDetail eventId={event.id} />;
  }

  // Not logged in + not published → redirect to login
  const { redirect } = await import('next/navigation');
  redirect('/login');
}
