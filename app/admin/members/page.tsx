'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminMemberDirectory } from '@/components/admin/admin-member-directory';

export default function AdminMembersPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-blue-400 hover:underline">&larr; Admin Dashboard</Link>
            <h1 className="mt-1 text-2xl font-bold">Member Directory</h1>
          </div>
        </div>
        <AdminMemberDirectory />
      </div>
    </div>
  );
}
