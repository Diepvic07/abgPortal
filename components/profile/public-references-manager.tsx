'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Member, MemberReference, MembershipStatus } from '@/types';
import { ToastNotification, useToasts } from '@/components/ui/toast-notification';

interface PublicReferencesManagerProps {
  member: Member;
  membershipStatus: MembershipStatus;
}

export function PublicReferencesManager({ member, membershipStatus }: PublicReferencesManagerProps) {
  const { toasts, showToast, dismissToast } = useToasts();
  const [references, setReferences] = useState<MemberReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const profileUrl = useMemo(() => {
    if (!member.public_profile_slug) return null;
    return `/u/${member.public_profile_slug}`;
  }, [member.public_profile_slug]);
  const isProfileLive = membershipStatus === 'premium' || membershipStatus === 'grace-period';

  useEffect(() => {
    async function loadReferences() {
      setLoading(true);
      try {
        const res = await fetch('/api/references/received');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load references');
        setReferences(data.references || []);
      } catch (error) {
        console.error('Failed to load references:', error);
        showToast('Unable to load received references.');
      } finally {
        setLoading(false);
      }
    }

    loadReferences();
  }, [showToast]);

  async function toggleVisibility(referenceId: string, isPubliclyVisible: boolean) {
    setUpdatingId(referenceId);
    try {
      const res = await fetch(`/api/references/${referenceId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_publicly_visible: isPubliclyVisible }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update reference visibility');

      setReferences((current) =>
        current.map((reference) => (reference.id === referenceId ? data.reference : reference)),
      );
      showToast(isPubliclyVisible ? 'Reference is now public.' : 'Reference hidden from public profile.', 'success');
    } catch (error) {
      console.error('Failed to update reference visibility:', error);
      showToast(error instanceof Error ? error.message : 'Unable to update reference visibility.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-brand">Public References</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose which received references appear on your public profile.
            </p>
          </div>
          {profileUrl && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <p className="font-medium text-gray-800">Public profile</p>
              <Link href={profileUrl} className="text-blue-600 hover:underline break-all">
                {profileUrl}
              </Link>
              <p className="mt-1 text-xs text-gray-500">
                {isProfileLive ? 'Currently accessible to the public.' : 'Inactive until your premium status is active.'}
              </p>
            </div>
          )}
        </div>

        {!isProfileLive && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your public profile exists, but it is only accessible while your premium status is active.
          </div>
        )}

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">Loading references...</div>
        ) : references.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            No references yet. Once other premium members write about you, you can choose what appears publicly.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {references.map((reference) => (
              <div key={reference.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{reference.writer_name || 'Member'}</p>
                    {(reference.writer_role || reference.writer_company) && (
                      <p className="text-sm text-gray-500">
                        {[reference.writer_role, reference.writer_company].filter(Boolean).join(' @ ')}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Context:</span> {reference.relationship_context}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={updatingId === reference.id}
                    onClick={() => toggleVisibility(reference.id, !reference.is_publicly_visible)}
                    aria-label={
                      reference.is_publicly_visible
                        ? `Hide reference from ${reference.writer_name || 'member'} on public profile`
                        : `Show reference from ${reference.writer_name || 'member'} on public profile`
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      reference.is_publicly_visible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    {reference.is_publicly_visible ? 'Public' : 'Hidden'}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{reference.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
