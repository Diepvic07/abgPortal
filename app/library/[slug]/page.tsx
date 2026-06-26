import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getServerLocale } from '@/lib/i18n/server-locale';
import { getMemberByEmail } from '@/lib/supabase-db';
import { getPublishedLibraryItemBySlug } from '@/lib/supabase-library';
import { getMembershipStatus } from '@/types';

export const dynamic = 'force-dynamic';

interface LibraryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LibraryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedLibraryItemBySlug(slug);

  if (!item) {
    return {
      title: 'Library | ABG Alumni Connect',
      description: 'Workshop recordings and resources for ABG Alumni members.',
    };
  }

  return {
    title: `${item.title} | ABG Alumni Library`,
    description: item.description.replace(/\s+/g, ' ').slice(0, 160),
  };
}

export default async function LibraryDetailPage({ params }: LibraryPageProps) {
  const [session, locale] = await Promise.all([
    getServerSession(authOptions),
    getServerLocale(),
  ]);

  if (!session?.user?.email) {
    redirect('/login');
  }

  const member = await getMemberByEmail(session.user.email);
  if (!member || member.approval_status !== 'approved') {
    redirect('/events?tab=library');
  }

  const { slug } = await params;
  const item = await getPublishedLibraryItemBySlug(slug);
  if (!item) {
    redirect('/events?tab=library');
  }

  const membershipStatus = getMembershipStatus(member);
  const canWatch = !!member.is_admin || membershipStatus === 'premium' || membershipStatus === 'grace-period';
  const isVi = locale === 'vi';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/events?tab=library" className="hover:text-blue-600">
          {isVi ? 'Thư viện' : 'Library'}
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-900">{item.title}</span>
      </nav>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {isVi ? 'Thư viện' : 'Library'}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Premium
          </span>
          {(item.event_title || item.proposal_title) && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {item.event_title || item.proposal_title}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{item.title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
      </div>

      {canWatch && item.drive_preview_url ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
          <div className="aspect-video">
            <iframe
              src={item.drive_preview_url}
              title={item.title}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">
            {isVi ? 'Video dành cho thành viên Premium' : 'Video is available for Premium members'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            {isVi
              ? 'Bạn vẫn có thể xem thông tin và tài nguyên bên dưới. Nâng cấp Premium để xem bản ghi workshop.'
              : 'You can still view the metadata and resources below. Upgrade to Premium to watch the workshop recording.'}
          </p>
          <Link
            href="/upgrade"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] hover:shadow-lg"
          >
            <span>⭐</span>
            <span>{isVi ? 'Nâng cấp Premium' : 'Upgrade to Premium'}</span>
          </Link>
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard label={isVi ? 'Diễn giả' : 'Speaker'} value={item.speaker_name || 'ABG Alumni'} />
        <InfoCard label={isVi ? 'Thời lượng' : 'Duration'} value={item.duration_text || (isVi ? 'Chưa cập nhật' : 'Not set')} />
        <InfoCard label={isVi ? 'Ngày ghi hình' : 'Recorded'} value={item.recorded_at || (isVi ? 'Chưa cập nhật' : 'Not set')} />
      </section>

      {item.resource_links.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {isVi ? 'Tài nguyên' : 'Resources'}
          </h2>
          <div className="mt-4 divide-y divide-gray-100">
            {item.resource_links.map((resource) => (
              <a
                key={`${resource.label}-${resource.url}`}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 py-3 text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                <span>{resource.label}</span>
                <span aria-hidden="true">Open</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {item.event_slug && (
        <div className="mt-6">
          <Link href={`/events/${item.event_slug}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
            {isVi ? 'Xem sự kiện liên quan' : 'View linked event'}
          </Link>
        </div>
      )}

      {!item.event_slug && item.proposal_slug && (
        <div className="mt-6">
          <Link href={`/proposals/${item.proposal_slug}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
            {isVi ? 'Xem đề xuất liên quan' : 'View linked proposal'}
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
