import type { Metadata } from 'next';
import { EventsHub } from '@/components/events/events-hub';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events | ABG Alumni Connect',
  description: 'Upcoming events, community proposals, and past activities from the ABG Alumni network.',
};

export default async function EventsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <EventsHub />
    </div>
  );
}
