'use client';

import { useState, useMemo } from 'react';
import { ProposalPoll, PollResponse } from '@/types';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-yellow-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  proposalId: string;
  poll: ProposalPoll | null;
  responses: PollResponse[];
  currentMemberId: string | null;
  isCreator: boolean;
  locale: string;
  onRefresh: () => void;
}

export function ProposalPollSection({
  proposalId,
  poll,
  responses,
  currentMemberId,
  isCreator,
  locale,
  onRefresh,
}: Props) {
  const vi = locale === 'vi';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const myResponse = useMemo(
    () => responses.find(r => r.member_id === currentMemberId),
    [responses, currentMemberId]
  );

  // Initialize from existing response
  useState(() => {
    if (myResponse) {
      setSelectedOptions(myResponse.selected_options || []);
    }
  });

  if (!poll) return null;

  // Build vote data per option
  const optionVoteData = useMemo(() => {
    const data: Record<string, { count: number; voters: PollResponse[] }> = {};
    for (const opt of poll.options) {
      data[opt] = { count: 0, voters: [] };
    }
    for (const resp of responses) {
      for (const o of resp.selected_options) {
        if (data[o]) {
          data[o].count++;
          data[o].voters.push(resp);
        }
      }
    }
    return data;
  }, [poll.options, responses]);

  const totalVotes = responses.length;
  const maxVotes = useMemo(() => {
    return Math.max(0, ...Object.values(optionVoteData).map(v => v.count));
  }, [optionVoteData]);

  function renderVoterAvatar(resp: PollResponse) {
    const name = resp.member_name || '?';
    const avatar = resp.member_avatar_url ? (
      <img src={resp.member_avatar_url} alt={name} className="w-6 h-6 rounded-full object-cover ring-2 ring-white" />
    ) : (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white ${getAvatarColor(name)}`}>
        {name[0].toUpperCase()}
      </div>
    );

    return (
      <span key={resp.id} title={name} className="-ml-1.5 first:ml-0">
        {avatar}
      </span>
    );
  }

  async function handleSubmitVote() {
    if (!currentMemberId) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/poll/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_options: selectedOptions }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (vi ? 'Lỗi gửi phản hồi' : 'Failed to submit vote'));
        return;
      }
      setSuccessMsg(
        myResponse
          ? (vi ? 'Đã cập nhật phiếu bầu!' : 'Vote updated!')
          : (vi ? 'Đã gửi phiếu bầu!' : 'Vote submitted!')
      );
      setIsEditing(false);
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClosePoll() {
    if (!poll) return;
    setSubmitting(true);
    try {
      await fetch(`/api/community/proposals/${proposalId}/poll`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: poll.status === 'open' ? 'closed' : 'open' }),
      });
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const canVote = currentMemberId && poll.status === 'open' && (isEditing || !myResponse);
  const hasVoted = !!myResponse;

  // Closed poll
  if (poll.status === 'closed') {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          📊 {poll.title || (vi ? 'Bình chọn' : 'Poll')}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {vi ? 'Đã đóng' : 'Closed'}
          </span>
        </h3>
        {poll.description && <p className="text-sm text-gray-600 mb-3">{poll.description}</p>}
        <div className="bg-gray-50 rounded-xl p-5 space-y-2">
          {poll.options.map((opt) => {
            const voteInfo = optionVoteData[opt] || { count: 0, voters: [] };
            const pct = totalVotes > 0 ? Math.round((voteInfo.count / totalVotes) * 100) : 0;
            return (
              <div key={opt} className="relative p-3 rounded-lg bg-white border border-gray-200">
                <div className="absolute inset-0 rounded-lg bg-blue-50" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between">
                  <span className="font-medium text-gray-900">{opt}</span>
                  <span className="text-sm font-semibold text-gray-600">{voteInfo.count} ({pct}%)</span>
                </div>
                {voteInfo.voters.length > 0 && (
                  <div className="relative flex items-center mt-1.5">
                    {voteInfo.voters.map(renderVoterAvatar)}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-gray-500 pt-1">{totalVotes} {vi ? 'phiếu bầu' : 'total votes'}</p>
        </div>
        {isCreator && (
          <button
            onClick={handleClosePoll}
            disabled={submitting}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {vi ? 'Mở lại bình chọn' : 'Reopen Poll'}
          </button>
        )}
      </div>
    );
  }

  // Open poll
  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        📊 {poll.title || (vi ? 'Bình chọn' : 'Poll')}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {vi ? 'Đang mở' : 'Open'}
        </span>
      </h3>
      {poll.description && <p className="text-sm text-gray-600 mb-3">{poll.description}</p>}

      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {poll.allow_multiple
              ? (vi ? 'Chọn một hoặc nhiều lựa chọn:' : 'Select one or more options:')
              : (vi ? 'Chọn một lựa chọn:' : 'Select one option:')}
          </p>
          {currentMemberId && !isEditing && hasVoted && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {vi ? 'Chỉnh sửa' : 'Edit'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {poll.options.map((opt) => {
            const voteInfo = optionVoteData[opt] || { count: 0, voters: [] };
            const isSelected = selectedOptions.includes(opt);
            const isWinning = voteInfo.count === maxVotes && maxVotes > 0;
            const pct = totalVotes > 0 ? Math.round((voteInfo.count / totalVotes) * 100) : 0;

            return (
              <div
                key={opt}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  canVote ? 'cursor-pointer' : ''
                } ${
                  canVote && isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isWinning
                    ? 'border-blue-200 bg-blue-50/50'
                    : 'border-gray-200 bg-white'
                } ${canVote && !isSelected ? 'hover:border-blue-300' : ''}`}
                onClick={() => {
                  if (!canVote) return;
                  if (poll.allow_multiple) {
                    setSelectedOptions(prev =>
                      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                    );
                  } else {
                    setSelectedOptions([opt]);
                  }
                }}
              >
                {/* Progress bar background */}
                {!canVote && totalVotes > 0 && (
                  <div className="absolute inset-0 rounded-lg bg-blue-50 opacity-50" style={{ width: `${pct}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {canVote && (
                      <div className={`w-5 h-5 rounded${poll.allow_multiple ? '' : '-full'} border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{opt}</span>
                  </div>
                  <span className={`text-sm font-semibold ${voteInfo.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {voteInfo.count} {vi ? 'phiếu' : 'votes'}{totalVotes > 0 ? ` (${pct}%)` : ''}
                  </span>
                </div>
                {voteInfo.voters.length > 0 && (
                  <div className={`relative flex items-center mt-2 ${canVote ? 'ml-8' : 'ml-0'} pl-0.5`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                      {voteInfo.voters.map(renderVoterAvatar)}
                    </div>
                    {voteInfo.voters.length <= 3 && (
                      <span className="ml-2 text-xs text-gray-500">
                        {voteInfo.voters.map(v => v.member_name).join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {totalVotes > 0 && (
          <p className="text-xs text-gray-500 mt-2">{totalVotes} {vi ? 'phiếu bầu' : 'total votes'}</p>
        )}
      </div>

      {/* Submit vote */}
      {canVote && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={handleSubmitVote}
            disabled={submitting || selectedOptions.length === 0}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            {submitting
              ? (vi ? 'Đang gửi...' : 'Submitting...')
              : hasVoted
                ? (vi ? 'Cập nhật phiếu bầu' : 'Update Vote')
                : (vi ? 'Gửi phiếu bầu' : 'Submit Vote')}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setSelectedOptions(myResponse?.selected_options || []);
                setIsEditing(false);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
          )}
        </div>
      )}

      {/* Creator controls */}
      {isCreator && (
        <div className="mt-3">
          <button
            onClick={handleClosePoll}
            disabled={submitting}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            {vi ? 'Đóng bình chọn' : 'Close Poll'}
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <span>✓</span> {successMsg}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
