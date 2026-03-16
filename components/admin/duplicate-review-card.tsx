'use client';

import { useState } from 'react';
import { Member } from '@/types';

interface DuplicateReviewCardProps {
  newMember: Member;
  existingMember: Member | null;
  onClearFlag: (memberId: string) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
  onEdit: (member: Member) => void;
  /** Show custom confirm modal instead of browser confirm() */
  onConfirmDelete?: (member: Member, proceed: () => void) => void;
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

export function DuplicateReviewCard({ newMember, existingMember, onClearFlag, onDelete, onEdit, onConfirmDelete }: DuplicateReviewCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

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

      {/* Footer action: Not a Duplicate */}
      <div className="px-4 py-3 bg-gray-50 border-t flex items-center">
        <button
          onClick={() => handleAction('clear', () => onClearFlag(newMember.id))}
          disabled={loading === 'clear'}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'clear' ? '...' : 'Not a Duplicate'}
        </button>
      </div>
    </div>
  );
}
