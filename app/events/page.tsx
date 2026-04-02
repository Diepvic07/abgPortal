import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { EventsHub } from '@/components/events/events-hub';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events | ABG Alumni Connect',
  description: 'Upcoming events, community proposals, and past activities from the ABG Alumni network.',
};

export default async function EventsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <EventsHub />
    </div>
  );
}
