'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MemberReference } from '@/types';
import { ToastNotification, useToasts } from '@/components/ui/toast-notification';
import { useTranslation } from '@/lib/i18n';

interface MemberReferenceComposerProps {
  recipientId: string;
  recipientName: string;
  writerEligible: boolean;
  recipientEligible: boolean;
  isSelf: boolean;
  existingReference: MemberReference | null;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function MemberReferenceComposer({
  recipientId,
  recipientName,
  writerEligible,
  recipientEligible,
  isSelf,
  existingReference,
}: MemberReferenceComposerProps) {
  const { t } = useTranslation();
  const { toasts, showToast, dismissToast } = useToasts();
  const [relationshipContext, setRelationshipContext] = useState('');
  const [body, setBody] = useState('');
  const [submittedReference, setSubmittedReference] = useState<MemberReference | null>(existingReference);
  const [loading, setLoading] = useState(false);

  if (isSelf) return null;

  const vars = { name: recipientName };
  const blocked = !writerEligible
    ? { message: t.references.writerNotEligible, showUpgrade: true }
    : !recipientEligible
    ? { message: interpolate(t.references.recipientNotEligible, vars), showUpgrade: false }
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_member_id: recipientId,
          relationship_context: relationshipContext,
          body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t.references.submitFailed);
        return;
      }

      setSubmittedReference(data.reference);
      setRelationshipContext('');
      setBody('');
      showToast(t.references.submitSuccess, 'success');
    } catch (error) {
      console.error('Failed to submit reference:', error);
      showToast(t.references.submitFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      <section className="max-w-3xl mx-auto mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{t.references.title}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {interpolate(t.references.intro, vars)}
        </p>

        {submittedReference ? (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm font-medium text-emerald-800">
              {interpolate(t.references.alreadySubmitted, vars)}
            </p>
            <p className="mt-2 text-sm text-emerald-700">
              {t.references.relationshipContext}: {submittedReference.relationship_context}
            </p>
          </div>
        ) : blocked ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <p>{blocked.message}</p>
            {blocked.showUpgrade && (
              <Link
                href="/upgrade"
                className="mt-2 inline-flex items-center gap-1 text-amber-900 font-medium underline underline-offset-2 hover:text-amber-950"
              >
                {t.references.upgradeLink}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {interpolate(t.references.relationshipLabel, vars)}
              </label>
              <textarea
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.references.relationshipPlaceholder}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.references.bodyLabel}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={2000}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.references.bodyPlaceholder}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.references.submitting : t.references.submit}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
