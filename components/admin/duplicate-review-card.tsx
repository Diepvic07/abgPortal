'use client';

import { useState, useMemo } from 'react';
import { Member } from '@/types';

interface DuplicateReviewCardProps {
  newMember: Member;
  existingMember: Member | null;
  onClearFlag: (memberId: string) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
  onEdit: (member: Member) => void;
  onMerge?: (keepId: string, deleteId: string, mergedFields: Record<string, unknown>) => Promise<void>;
  /** Show custom confirm modal instead of browser confirm() */
  onConfirmDelete?: (member: Member, proceed: () => void) => void;
  t?: Record<string, unknown>;
}

/** All detail fields to display for each member side-by-side */
const DETAIL_FIELDS: { key: keyof Member; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'abg_class', label: 'Class' },
  { key: 'role', label: 'Role' },
  { key: 'company', label: 'Company' },
  { key: 'phone', label: 'Phone' },
  { key: 'expertise', label: 'Expertise' },
  { key: 'bio', label: 'Bio' },
  { key: 'country', label: 'Country' },
  { key: 'gender', label: 'Gender' },
  { key: 'birth_year', label: 'Birth Year' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'company_website', label: 'Website' },
  { key: 'can_help_with', label: 'Can Help With' },
  { key: 'looking_for', label: 'Looking For' },
];

/** Mergeable fields (excluding email which is handled specially) */
const MERGE_FIELDS: { key: keyof Member; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'company', label: 'Company' },
  { key: 'abg_class', label: 'Class' },
  { key: 'phone', label: 'Phone' },
  { key: 'expertise', label: 'Expertise' },
  { key: 'bio', label: 'Bio' },
  { key: 'country', label: 'Country' },
  { key: 'gender', label: 'Gender' },
  { key: 'birth_year', label: 'Birth Year' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'relationship_status', label: 'Relationship Status' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'company_website', label: 'Website' },
  { key: 'can_help_with', label: 'Can Help With' },
  { key: 'looking_for', label: 'Looking For' },
];

function countFilledFields(member: Member): number {
  return MERGE_FIELDS.filter(({ key }) => {
    const v = member[key];
    return v && String(v).trim() !== '';
  }).length;
}

function MemberColumn({
  member,
  label,
  loading,
  onEdit,
  onDelete,
  onConfirmDelete,
}: {
  member: Member;
  label: string;
  loading: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete?: (member: Member, proceed: () => void) => void;
}) {
  const deleteKey = `delete-${member.id}`;

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(member, onDelete);
    } else {
      onDelete();
    }
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Header with label + status badges */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
        <div className="flex gap-1 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            member.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
            member.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {member.approval_status}
          </span>
          {member.is_csv_imported && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">CSV</span>
          )}
          {member.paid && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">Premium</span>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="font-semibold text-gray-900 mb-2">{member.name}</p>

      {/* All detail fields */}
      <div className="space-y-1">
        {DETAIL_FIELDS.map(({ key, label: fieldLabel }) => {
          const value = member[key];
          if (!value) return null;
          return (
            <p key={key} className="text-sm">
              <span className="text-gray-500">{fieldLabel}:</span>{' '}
              <span className="text-gray-800 break-all">{String(value)}</span>
            </p>
          );
        })}
        {member.secondary_emails && member.secondary_emails.length > 0 && (
          <p className="text-sm">
            <span className="text-gray-500">Other Emails:</span>{' '}
            <span className="text-gray-800 break-all">{member.secondary_emails.join(', ')}</span>
          </p>
        )}
      </div>

      {/* Per-member actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={loading === deleteKey}
          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === deleteKey ? '...' : 'Delete This Profile'}
        </button>
      </div>
    </div>
  );
}

/** Merge Preview Modal */
function MergePreviewModal({
  memberA,
  memberB,
  onConfirm,
  onCancel,
  loading,
  t,
}: {
  memberA: Member;
  memberB: Member;
  onConfirm: (keepId: string, deleteId: string, mergedFields: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
  t?: Record<string, unknown>;
}) {
  const merge = (t as { admin?: { merge?: Record<string, string> } })?.admin?.merge || {};

  // Auto-select member with more data as "keep"
  const aCount = countFilledFields(memberA);
  const bCount = countFilledFields(memberB);
  const [keepId, setKeepId] = useState(aCount >= bCount ? memberA.id : memberB.id);

  const keepMember = keepId === memberA.id ? memberA : memberB;
  const deleteMember = keepId === memberA.id ? memberB : memberA;

  // Build initial merged fields: for each field, if both have different values, track as conflict
  const initialSelections = useMemo(() => {
    const selections: Record<string, string> = {};
    for (const { key } of MERGE_FIELDS) {
      const keepVal = String(keepMember[key] || '').trim();
      const deleteVal = String(deleteMember[key] || '').trim();
      if (keepVal) {
        selections[key] = keepVal;
      } else if (deleteVal) {
        selections[key] = deleteVal;
      } else {
        selections[key] = '';
      }
    }
    return selections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepId]);

  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);

  // Reset selections when keepId changes
  const [prevKeepId, setPrevKeepId] = useState(keepId);
  if (keepId !== prevKeepId) {
    setPrevKeepId(keepId);
    setSelections(initialSelections);
  }

  const conflicts = MERGE_FIELDS.filter(({ key }) => {
    const a = String(memberA[key] || '').trim();
    const b = String(memberB[key] || '').trim();
    return a && b && a !== b;
  });

  const autoFilled = MERGE_FIELDS.filter(({ key }) => {
    const keepVal = String(keepMember[key] || '').trim();
    const deleteVal = String(deleteMember[key] || '').trim();
    return !keepVal && deleteVal;
  });

  const willTransferPremium = deleteMember.paid && !keepMember.paid;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{merge.mergeMembers || 'Merge Members'}</h2>
          <p className="text-sm text-gray-500">{memberA.name} + {memberB.name}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Keep/Delete toggle */}
          <div className="flex gap-3">
            {[memberA, memberB].map((m) => (
              <button
                key={m.id}
                onClick={() => setKeepId(m.id)}
                className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                  keepId === m.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                  {m.paid && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Premium</span>}
                </div>
                <p className="text-xs text-gray-500 break-all">{m.email}</p>
                <p className={`text-xs mt-1 font-medium ${keepId === m.id ? 'text-blue-600' : 'text-red-500'}`}>
                  {keepId === m.id ? (merge.keepProfile || 'Keep this profile') : (merge.discardProfile || 'Will be deleted')}
                </p>
              </button>
            ))}
          </div>

          {/* Premium transfer notice */}
          {willTransferPremium && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-purple-600 text-sm">★</span>
              <span className="text-sm text-purple-800">{merge.transferPremium || 'Transfer Premium status'}</span>
            </div>
          )}

          {/* Email notice */}
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">{deleteMember.email}</span>{' '}
              {merge.emailBecomeSecondary || 'will become a secondary email'}
            </p>
          </div>

          {/* Conflicting fields */}
          {conflicts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{merge.conflictingFields || 'Conflicting Fields'}</h3>
              <div className="space-y-2">
                {conflicts.map(({ key, label }) => {
                  const aVal = String(memberA[key] || '');
                  const bVal = String(memberB[key] || '');
                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                      <div className="space-y-1">
                        {[{ member: memberA, val: aVal }, { member: memberB, val: bVal }].map(({ member, val }) => (
                          <label key={member.id} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`merge-${key}`}
                              checked={selections[key] === val}
                              onChange={() => setSelections((prev) => ({ ...prev, [key]: val }))}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-gray-800 break-all">
                              {val}
                              <span className="text-xs text-gray-400 ml-1">({member.name})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto-filled fields */}
          {autoFilled.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{merge.autoFilled || 'Auto-filled from other profile'}</h3>
              <div className="space-y-1">
                {autoFilled.map(({ key, label }) => (
                  <p key={key} className="text-sm">
                    <span className="text-gray-500">{label}:</span>{' '}
                    <span className="text-gray-800">{String(deleteMember[key] || '')}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(keepId, deleteMember.id, selections)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {loading ? (merge.merging || 'Merging...') : (merge.confirmMerge || 'Confirm Merge')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DuplicateReviewCard({ newMember, existingMember, onClearFlag, onDelete, onEdit, onMerge, onConfirmDelete, t }: DuplicateReviewCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showMerge, setShowMerge] = useState(false);

  const merge = (t as { admin?: { merge?: Record<string, string> } })?.admin?.merge || {};

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const confidenceLevel = newMember.duplicate_note?.split(':')[0] || 'MEDIUM';

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
              confidenceLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {confidenceLevel}
            </span>
            <span className="text-sm text-gray-600">{newMember.duplicate_note?.split(': ').slice(1).join(': ')}</span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(newMember.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Side-by-side comparison */}
        <div className="p-4 flex gap-4">
          <MemberColumn
            member={newMember}
            label="New Signup"
            loading={loading}
            onEdit={() => onEdit(newMember)}
            onDelete={() => handleAction(`delete-${newMember.id}`, () => onDelete(newMember.id))}
            onConfirmDelete={onConfirmDelete}
          />
          {existingMember ? (
            <>
              <div className="w-px bg-gray-200 self-stretch" />
              <MemberColumn
                member={existingMember}
                label="Existing (CSV)"
                loading={loading}
                onEdit={() => onEdit(existingMember)}
                onDelete={() => handleAction(`delete-${existingMember.id}`, () => onDelete(existingMember.id))}
                onConfirmDelete={onConfirmDelete}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Original member not found
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-2">
          <button
            onClick={() => handleAction('clear', () => onClearFlag(newMember.id))}
            disabled={loading === 'clear'}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === 'clear' ? '...' : 'Not a Duplicate'}
          </button>
          {existingMember && onMerge && (
            <button
              onClick={() => setShowMerge(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {merge.mergeProfiles || 'Merge Profiles'}
            </button>
          )}
        </div>
      </div>

      {/* Merge Preview Modal */}
      {showMerge && existingMember && onMerge && (
        <MergePreviewModal
          memberA={newMember}
          memberB={existingMember}
          loading={loading === 'merge'}
          t={t}
          onCancel={() => setShowMerge(false)}
          onConfirm={(keepId, deleteId, mergedFields) => {
            handleAction('merge', async () => {
              await onMerge(keepId, deleteId, mergedFields);
              setShowMerge(false);
            });
          }}
        />
      )}
    </>
  );
}
