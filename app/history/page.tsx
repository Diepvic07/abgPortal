import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { HistoryPageClient } from '@/components/history/history-page-client';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/');
  }

  return <HistoryPageClient />;
}
