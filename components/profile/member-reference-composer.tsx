'use client';

import { useState } from 'react';
import { MemberReference } from '@/types';
import { ToastNotification, useToasts } from '@/components/ui/toast-notification';

interface MemberReferenceComposerProps {
  recipientId: string;
  recipientName: string;
  writerEligible: boolean;
  recipientEligible: boolean;
  isSelf: boolean;
  existingReference: MemberReference | null;
}

export function MemberReferenceComposer({
  recipientId,
  recipientName,
  writerEligible,
  recipientEligible,
  isSelf,
  existingReference,
}: MemberReferenceComposerProps) {
  const { toasts, showToast, dismissToast } = useToasts();
  const [relationshipContext, setRelationshipContext] = useState('');
  const [body, setBody] = useState('');
  const [submittedReference, setSubmittedReference] = useState<MemberReference | null>(existingReference);
  const [loading, setLoading] = useState(false);

  if (isSelf) return null;

  const blockedMessage = !writerEligible
    ? 'Only premium approved members can write references.'
    : !recipientEligible
    ? `${recipientName} is not currently eligible to receive public references.`
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
        showToast(data.error || 'Unable to submit reference.');
        return;
      }

      setSubmittedReference(data.reference);
      setRelationshipContext('');
      setBody('');
      showToast('Reference submitted successfully.', 'success');
    } catch (error) {
      console.error('Failed to submit reference:', error);
      showToast('Unable to submit reference.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      <section className="max-w-3xl mx-auto mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Write a Reference</h2>
        <p className="mt-1 text-sm text-gray-600">
          References are immutable after submission. {recipientName} can decide whether to show them publicly on their public profile.
        </p>

        {submittedReference ? (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm font-medium text-emerald-800">
              You already submitted a reference for {recipientName}.
            </p>
            <p className="mt-2 text-sm text-emerald-700">
              Relationship context: {submittedReference.relationship_context}
            </p>
          </div>
        ) : blockedMessage ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            {blockedMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">How do you know {recipientName}?</label>
              <textarea
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="For example: We worked together on ABG community events and startup mentoring."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={2000}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe this member's strengths, credibility, or the kind of collaboration experience others should know about."
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Reference'}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
