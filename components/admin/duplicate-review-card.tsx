'use client';

import { useState } from 'react';
import { Member } from '@/types';

interface DuplicateReviewCardProps {
  newMember: Member;
  existingMember: Member | null;
  onClearFlag: (memberId: string) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
  onEdit: (member: Member) => void;
}

function MemberColumn({ member, label }: { member: Member; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</p>
      <div className="space-y-2">
        <div>
          <p className="font-semibold text-gray-900">{member.name}</p>
          <p className="text-sm text-gray-600">{member.email}</p>
        </div>
        {member.abg_class && (
          <p className="text-sm"><span className="text-gray-500">Class:</span> {member.abg_class}</p>
        )}
        {member.role && (
          <p className="text-sm"><span className="text-gray-500">Role:</span> {member.role}</p>
        )}
        {member.company && (
          <p className="text-sm"><span className="text-gray-500">Company:</span> {member.company}</p>
        )}
        {member.phone && (
          <p className="text-sm"><span className="text-gray-500">Phone:</span> {member.phone}</p>
        )}
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
    </div>
  );
}

export function DuplicateReviewCard({ newMember, existingMember, onClearFlag, onDelete, onEdit }: DuplicateReviewCardProps) {
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
        <MemberColumn member={newMember} label="New Signup" />
        {existingMember ? (
          <>
            <div className="w-px bg-gray-200 self-stretch" />
            <MemberColumn member={existingMember} label="Existing (CSV)" />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Original member not found
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-2">
        <button
          onClick={() => onEdit(newMember)}
          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Edit Profile
        </button>
        <button
          onClick={() => handleAction('clear', () => onClearFlag(newMember.id))}
          disabled={loading === 'clear'}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'clear' ? '...' : 'Not a Duplicate'}
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete member "${newMember.name}"? This cannot be undone.`)) {
              handleAction('delete', () => onDelete(newMember.id));
            }
          }}
          disabled={loading === 'delete'}
          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'delete' ? '...' : 'Delete Duplicate'}
        </button>
      </div>
    </div>
  );
}
