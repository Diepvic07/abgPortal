/* eslint-disable @next/next/no-img-element */

import { notFound } from 'next/navigation';
import { getPublicProfileBySlug } from '@/lib/member-references';

export const dynamic = 'force-dynamic';

interface PublicProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  const { member, references } = profile;

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <section className="rounded-3xl bg-white border border-stone-200 shadow-sm p-8">
          <div className="flex items-start gap-4">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">
                {member.name?.[0] || '?'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold text-stone-900">{member.name}</h1>
              <p className="mt-2 text-sm text-stone-600">
                {[member.role, member.company].filter(Boolean).join(' @ ')}
              </p>
              {member.abg_class && (
                <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Tham gia khóa ABG: {member.abg_class}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white border border-stone-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-stone-900">References</h2>
          {references.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No public references yet.</p>
          ) : (
            <div className="mt-5 space-y-5">
              {references.map((reference) => (
                <article key={reference.id} className="rounded-2xl bg-stone-50 p-5">
                  <div className="flex items-start gap-4">
                    {reference.writer_avatar_url ? (
                      <img
                        src={reference.writer_avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
                        {reference.writer_name?.[0] || 'M'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">{reference.writer_name || 'Member'}</p>
                      {(reference.writer_role || reference.writer_company) && (
                        <p className="mt-1 text-sm text-stone-500">
                          {[reference.writer_role, reference.writer_company].filter(Boolean).join(' @ ')}
                        </p>
                      )}
                      {reference.writer_abg_class && (
                        <p className="mt-2 text-xs font-medium text-blue-700">
                          Tham gia khóa ABG: {reference.writer_abg_class}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-700">{reference.body}</p>
                  {reference.relationship_context && (
                    <p className="mt-3 text-xs text-stone-500">
                      <span className="font-medium text-stone-600">Context:</span>{' '}
                      {reference.relationship_context}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
