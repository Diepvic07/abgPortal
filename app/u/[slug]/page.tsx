import { redirect } from 'next/navigation';
import { getPublicProfileUrl } from '@/lib/profile-url';

interface LegacyPublicProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyPublicProfilePage({ params }: LegacyPublicProfilePageProps) {
  const { slug } = await params;
  redirect(getPublicProfileUrl(slug));
}
