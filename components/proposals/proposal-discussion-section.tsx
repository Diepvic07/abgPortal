'use client';

import { useState, useMemo } from 'react';
import { ProposalDiscussion, DiscussionResponse } from '@/types';

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
  proposalSlug: string;
  discussion: ProposalDiscussion | null;
  responses: DiscussionResponse[];
  currentMemberId: string | null;
  isCreator: boolean;
  locale: string;
  onRefresh: () => void;
}

export function ProposalDiscussionSection({
  proposalId,
  discussion,
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

  // For member voting
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // For creator scheduling
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Pre-fill from existing response
  const myResponse = useMemo(
    () => responses.find(r => r.member_id === currentMemberId),
    [responses, currentMemberId]
  );

  // Initialize from existing response
  useState(() => {
    if (myResponse) {
      setSelectedDates(myResponse.available_dates || []);
    }
  });

  if (!discussion) return null;

  // Build voter info per date option, including full response data for avatars
  const dateVoteData = useMemo(() => {
    const data: Record<string, { count: number; voters: DiscussionResponse[] }> = {};
    for (const dateOpt of discussion.date_options) {
      data[dateOpt] = { count: 0, voters: [] };
    }
    for (const resp of responses) {
      for (const d of resp.available_dates) {
        if (data[d]) {
          data[d].count++;
          data[d].voters.push(resp);
        }
      }
    }
    return data;
  }, [discussion.date_options, responses]);

  const mostVotedDate = useMemo(() => {
    let maxDate = discussion.date_options[0];
    let maxCount = 0;
    for (const [date, info] of Object.entries(dateVoteData)) {
      if (info.count > maxCount) {
        maxCount = info.count;
        maxDate = date;
      }
    }
    return maxDate;
  }, [dateVoteData, discussion.date_options]);

  function formatDateDisplay(dateStr: string) {
    try {
      const timeMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (timeMatch) {
        const [, datePart, startTime, endTime] = timeMatch;
        const dateFormatted = new Date(datePart + 'T00:00:00').toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return `${dateFormatted}, ${startTime} - ${endTime}`;
      }
      return new Date(dateStr + 'T00:00:00').toLocaleDateString(vi ? 'vi-VN' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function formatMeetingDateTime(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString(vi ? 'vi-VN' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
    } catch {
      return dateStr;
    }
  }

  function renderVoterAvatar(resp: DiscussionResponse) {
    const name = resp.member_name || '?';

    const avatar = resp.member_avatar_url ? (
      <img src={resp.member_avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover ring-2 ring-white" />
    ) : (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white ${getAvatarColor(name)}`}>
        {name[0].toUpperCase()}
      </div>
    );

    return (
      <span key={resp.id} title={name} className="-ml-1.5 first:ml-0">
        {avatar}
      </span>
    );
  }

  async function handleSubmitResponse() {
    if (!currentMemberId) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_dates: selectedDates,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (vi ? 'Lỗi gửi phản hồi' : 'Failed to submit response'));
        return;
      }
      setSuccessMsg(
        myResponse
          ? (vi ? 'Đã cập nhật phản hồi thành công!' : 'Response updated successfully!')
          : (vi ? 'Đã gửi phản hồi thành công!' : 'Response submitted successfully!')
      );
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduleMeeting() {
    if (!meetingDate || !meetingTime || !meetingLink) {
      setError(vi ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill in all fields');
      return;
    }
    if (!meetingLink.startsWith('https://meet.google.com/')) {
      setError(vi ? 'Vui lòng nhập link Google Meet hợp lệ' : 'Please enter a valid Google Meet link');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const meetingDateTime = `${meetingDate}T${meetingTime}:00+07:00`;
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
          meeting_date: meetingDateTime,
          meeting_link: meetingLink,
          invited_emails: selectedEmails,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (vi ? 'Lỗi lên lịch' : 'Failed to schedule'));
        return;
      }
      setShowSchedulePanel(false);
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(status: 'completed' | 'cancelled' | 'open') {
    setSubmitting(true);
    try {
      await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ==================== RENDER ====================

  // Status: completed or cancelled
  if (discussion.status === 'completed' || discussion.status === 'cancelled') {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          💬 {discussion.title || (vi ? 'Thảo luận trực tuyến' : 'Online Discussion')}
        </h3>
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            discussion.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {discussion.status === 'completed'
              ? (vi ? 'Đã hoàn thành' : 'Completed')
              : (vi ? 'Đã hủy' : 'Cancelled')}
          </div>
          {isCreator && (
            <button
              onClick={() => handleUpdateStatus('open' as any)}
              disabled={submitting}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {vi ? 'Mở lại' : 'Reopen'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Status: scheduled
  if (discussion.status === 'scheduled') {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          💬 {discussion.title || (vi ? 'Thảo luận trực tuyến' : 'Online Discussion')}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {vi ? 'Đã lên lịch' : 'Scheduled'}
          </span>
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-semibold text-gray-900">
                {discussion.meeting_date ? formatMeetingDateTime(discussion.meeting_date) : ''}
              </p>
              <p className="text-sm text-gray-500">{vi ? 'Giờ Việt Nam (GMT+7)' : 'Vietnam Time (GMT+7)'}</p>
            </div>
          </div>

          {discussion.meeting_link && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <a
                href={discussion.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {vi ? 'Tham gia Google Meet' : 'Join Google Meet'}
              </a>
            </div>
          )}

          {discussion.invited_emails && discussion.invited_emails.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {vi ? `${discussion.invited_emails.length} người được mời` : `${discussion.invited_emails.length} invited`}
              </p>
            </div>
          )}

        </div>

        {isCreator && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={submitting}
              className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {vi ? 'Đánh dấu hoàn thành' : 'Mark Completed'}
            </button>
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={submitting}
              className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {vi ? 'Hủy buổi thảo luận' : 'Cancel Discussion'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Status: open — voting + questions
  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        💬 {discussion.title || (vi ? 'Thảo luận trực tuyến' : 'Online Discussion')}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {vi ? 'Đang mở' : 'Open'}
        </span>
      </h3>
      {discussion.description && <p className="text-sm text-gray-600 mb-3">{discussion.description}</p>}

      {/* Date voting / results */}
      <div className="bg-gray-50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {vi ? 'Bỏ phiếu ngày bạn có thể tham gia:' : 'Vote for dates you can join:'}
          </p>
          {currentMemberId && !isCreator && !isEditing && myResponse && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {vi ? 'Chỉnh sửa' : 'Edit'}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {discussion.date_options.map((dateOpt) => {
            const voteInfo = dateVoteData[dateOpt] || { count: 0, voters: [] };
            const isSelected = selectedDates.includes(dateOpt);
            const canEdit = currentMemberId && !isCreator && (isEditing || !myResponse);
            return (
              <div
                key={dateOpt}
                className={`p-3 rounded-lg border-2 transition-all ${
                  canEdit ? 'cursor-pointer' : ''
                } ${
                  canEdit && isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                } ${canEdit && !isSelected ? 'hover:border-blue-300' : ''}`}
                onClick={() => {
                  if (!canEdit) return;
                  setSelectedDates(prev =>
                    prev.includes(dateOpt)
                      ? prev.filter(d => d !== dateOpt)
                      : [...prev, dateOpt]
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{formatDateDisplay(dateOpt)}</span>
                  </div>
                  <span className={`text-sm font-semibold ${voteInfo.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {voteInfo.count} {vi ? 'phiếu' : 'votes'}
                  </span>
                </div>
                {/* Voter avatars */}
                {voteInfo.voters.length > 0 && (
                  <div className={`flex items-center mt-2 ${canEdit ? 'ml-8' : 'ml-0'} pl-0.5`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                      {voteInfo.voters.map((voter) => renderVoterAvatar(voter))}
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
      </div>

      {/* Submit vote (for non-creators, only when editing or first vote) */}
      {currentMemberId && !isCreator && (isEditing || !myResponse) && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={async () => {
              await handleSubmitResponse();
              setIsEditing(false);
            }}
            disabled={submitting || selectedDates.length === 0}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            {submitting
              ? (vi ? 'Đang gửi...' : 'Submitting...')
              : myResponse
                ? (vi ? 'Cập nhật phản hồi' : 'Update Response')
                : (vi ? 'Gửi phản hồi' : 'Submit Response')}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setSelectedDates(myResponse?.available_dates || []);
                setIsEditing(false);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
          )}
        </div>
      )}

      {/* Creator view: schedule button */}
      {isCreator && (
        <>
          {/* Response summary */}
          <div className="bg-gray-50 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">
              {vi ? `${responses.length} phản hồi` : `${responses.length} response(s)`}
            </p>
          </div>

          {/* Schedule Meeting Button */}
          {!showSchedulePanel && (
            <button
              onClick={() => {
                setShowSchedulePanel(true);
                // Parse most voted date option (format: YYYY-MM-DDThh:mm-hh:mm or YYYY-MM-DD)
                const timeMatch = mostVotedDate.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
                if (timeMatch) {
                  setMeetingDate(timeMatch[1]);
                  setMeetingTime(timeMatch[2]);
                } else {
                  setMeetingDate(mostVotedDate);
                }
                // Pre-select all respondent emails
                const emails = responses
                  .filter(r => r.member_email)
                  .map(r => r.member_email!);
                setSelectedEmails([...new Set(emails)]);
              }}
              disabled={responses.length === 0}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
            >
              {vi ? 'Lên lịch buổi thảo luận' : 'Schedule Discussion'}
            </button>
          )}

          {/* Schedule Panel */}
          {showSchedulePanel && (
            <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900">
                {vi ? 'Lên lịch buổi thảo luận' : 'Schedule Discussion Meeting'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {vi ? 'Ngày' : 'Date'} *
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {vi ? 'Giờ' : 'Time'} *
                  </label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Meet Link *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                  <a
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap border border-gray-300"
                  >
                    {vi ? 'Tạo Meet' : 'Create Meet'}
                  </a>
                </div>
              </div>

              {/* Invite list */}
              {responses.filter(r => r.member_email).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {vi ? 'Mời tham gia:' : 'Invite:'}
                  </label>
                  <div className="space-y-1.5">
                    {responses.filter(r => r.member_email).map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(r.member_email!)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmails(prev => [...prev, r.member_email!]);
                            } else {
                              setSelectedEmails(prev => prev.filter(em => em !== r.member_email));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{r.member_name}</span>
                        <span className="text-gray-400 text-xs">{r.member_email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleScheduleMeeting}
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
                >
                  {submitting
                    ? (vi ? 'Đang gửi...' : 'Sending...')
                    : (vi ? 'Gửi lời mời & Lên lịch' : 'Send Invitations & Schedule')}
                </button>
                <button
                  onClick={() => setShowSchedulePanel(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  {vi ? 'Hủy' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Cancel discussion */}
          <div className="mt-3">
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={submitting}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              {vi ? 'Hủy thảo luận' : 'Cancel Discussion'}
            </button>
          </div>
        </>
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
