'use client';

import { useEffect, useState } from 'react';
import type { MemberReference } from '@/types';

export function AdminReferenceManager() {
  const [references, setReferences] = useState<MemberReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReferences();
  }, []);

  async function fetchReferences() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/references');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load references');
      setReferences(data.references || []);
    } catch (error) {
      console.error('Failed to fetch references:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleModeration(referenceId: string, action: 'remove' | 'restore') {
    setActionId(referenceId);
    try {
      const res = await fetch(`/api/admin/references/${referenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          moderation_note: notes[referenceId] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to moderate reference');

      setReferences((current) =>
        current.map((reference) => (reference.id === referenceId ? data.reference : reference)),
      );
    } catch (error) {
      console.error('Failed to moderate reference:', error);
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading references...</div>;
  }

  if (references.length === 0) {
    return <div className="text-sm text-gray-500">No references found.</div>;
  }

  return (
    <div className="space-y-4">
      {references.map((reference) => {
        const isRemoved = reference.status === 'removed_by_admin';

        return (
          <div key={reference.id} className="rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {reference.writer_name || 'Member'} → {reference.recipient_name || 'Member'}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  status: {reference.status}
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Relationship context:</span> {reference.relationship_context}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModeration(reference.id, isRemoved ? 'restore' : 'remove')}
                  disabled={actionId === reference.id}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    isRemoved
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-700'
                  } disabled:opacity-50`}
                >
                  {isRemoved ? 'Restore' : 'Remove'}
                </button>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{reference.body}</p>

            <textarea
              value={notes[reference.id] || ''}
              onChange={(e) => setNotes((current) => ({ ...current, [reference.id]: e.target.value }))}
              rows={2}
              maxLength={500}
              className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Moderation note (optional)"
            />
          </div>
        );
      })}
    </div>
  );
}
