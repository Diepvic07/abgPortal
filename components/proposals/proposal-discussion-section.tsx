'use client';

import { useState, useMemo } from 'react';
import { ProposalDiscussion, DiscussionResponse, CommunityCommitment } from '@/types';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { MeetingPlatform, normalizeMeetingLink } from '@/lib/meeting-link';

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
  commitments?: CommunityCommitment[];
  currentMemberId: string | null;
  isCreator: boolean;
  isAdmin?: boolean;
  locale: string;
  onRefresh: () => void;
}

export function ProposalDiscussionSection({
  proposalId,
  discussion,
  responses,
  commitments = [],
  currentMemberId,
  isCreator,
  isAdmin = false,
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
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>('meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [confirmClearVotesOpen, setConfirmClearVotesOpen] = useState(false);
  const [confirmCancelDiscussionOpen, setConfirmCancelDiscussionOpen] = useState(false);

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
      const localeStr = vi ? 'vi-VN' : 'en-US';
      const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };

      const timeMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (timeMatch) {
        const [, datePart, startTime, endTime] = timeMatch;
        const d = new Date(datePart + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        return `${d.toLocaleDateString(localeStr, opts)}, ${startTime} - ${endTime}`;
      }

      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(localeStr, opts);
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
    const normalizedLink = normalizeMeetingLink(meetingLink);
    if (!normalizedLink) {
      setError(vi ? 'Vui lòng nhập link HTTPS hợp lệ' : 'Please enter a valid HTTPS meeting link');
      return;
    }
    if (meetingPlatform === 'meet' && !normalizedLink.startsWith('https://meet.google.com/')) {
      setError(vi ? 'Link không phải Google Meet. Vui lòng đổi nền tảng hoặc dán link Meet hợp lệ.' : 'Not a Google Meet link. Switch platform or paste a valid Meet link.');
      return;
    }
    if (meetingPlatform === 'zoom' && !/zoom\.(us|com)/i.test(normalizedLink)) {
      setError(vi ? 'Link không phải Zoom. Vui lòng đổi nền tảng hoặc dán link Zoom hợp lệ.' : 'Not a Zoom link. Switch platform or paste a valid Zoom link.');
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
          meeting_link: normalizedLink,
          meeting_platform: meetingPlatform,
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
          {(isCreator || isAdmin) && (
            <button
              onClick={() => handleUpdateStatus('open' as any)}
              disabled={submitting}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {vi ? 'Mở lại' : 'Reopen'}
            </button>
          )}
        </div>

        {discussion.status === 'completed' && (isCreator || isAdmin) && (
          <div className="mt-5">
            <SendUpdateSection
              proposalId={proposalId}
              commitments={commitments}
              vi={vi}
              onError={setError}
            />
          </div>
        )}
      </div>
    );
  }

  // Status: scheduled
  if (discussion.status === 'scheduled') {
    return (
      <ScheduledView
        discussion={discussion}
        isCreator={isCreator}
        isAdmin={isAdmin}
        submitting={submitting}
        vi={vi}
        proposalId={proposalId}
        formatMeetingDateTime={formatMeetingDateTime}
        handleUpdateStatus={handleUpdateStatus}
        setSubmitting={setSubmitting}
        setError={setError}
        onRefresh={onRefresh}
      />
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
                    <span className="ml-2 text-xs text-gray-500">
                      {voteInfo.voters.map(v => v.member_name).join(', ')}
                    </span>
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
              if (myResponse && selectedDates.length === 0) {
                setConfirmClearVotesOpen(true);
                return;
              }
              await handleSubmitResponse();
              setIsEditing(false);
            }}
            disabled={submitting || (!myResponse && selectedDates.length === 0)}
            className={`text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 text-sm ${
              myResponse && selectedDates.length === 0
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting
              ? (vi ? 'Đang gửi...' : 'Submitting...')
              : myResponse && selectedDates.length === 0
                ? (vi ? 'Xóa phản hồi' : 'Remove Response')
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

      {/* Creator or admin view: schedule button */}
      {(isCreator || isAdmin) && (
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
                // Pre-select all participant emails (from both responses and commitments)
                const responseEmails = responses
                  .filter(r => r.member_email)
                  .map(r => r.member_email!);
                const commitmentEmails = commitments
                  .filter(c => c.member_email)
                  .map(c => c.member_email!);
                setSelectedEmails([...new Set([...responseEmails, ...commitmentEmails])]);
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {vi ? 'Nền tảng họp' : 'Meeting platform'} *
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(['meet', 'zoom', 'other'] as MeetingPlatform[]).map((p) => (
                    <label
                      key={p}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        meetingPlatform === p
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="schedule-meeting-platform"
                        value={p}
                        checked={meetingPlatform === p}
                        onChange={() => setMeetingPlatform(p)}
                        className="sr-only"
                      />
                      {p === 'meet' && 'Google Meet'}
                      {p === 'zoom' && 'Zoom'}
                      {p === 'other' && (vi ? 'Khác' : 'Other')}
                    </label>
                  ))}
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {meetingPlatform === 'meet'
                    ? 'Google Meet Link'
                    : meetingPlatform === 'zoom'
                      ? (vi ? 'Link Zoom' : 'Zoom Link')
                      : (vi ? 'Link tham gia' : 'Meeting Link')} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder={
                      meetingPlatform === 'meet'
                        ? 'https://meet.google.com/xxx-xxxx-xxx'
                        : meetingPlatform === 'zoom'
                          ? 'https://us02web.zoom.us/j/...'
                          : 'https://...'
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                  {meetingPlatform === 'meet' && (
                    <a
                      href="https://meet.google.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap border border-gray-300"
                    >
                      {vi ? 'Tạo Meet' : 'Create Meet'}
                    </a>
                  )}
                  {meetingPlatform === 'zoom' && (
                    <a
                      href="https://zoom.us/start/videomeeting"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap border border-gray-300"
                    >
                      {vi ? 'Mở Zoom' : 'Open Zoom'}
                    </a>
                  )}
                </div>
              </div>

              {/* Invite list — all participants from commitments and responses */}
              {(() => {
                // Build deduplicated participant list from commitments + responses
                const participantMap = new Map<string, { name: string; email: string }>();
                commitments.forEach(c => {
                  if (c.member_email) participantMap.set(c.member_email, { name: c.member_name || '', email: c.member_email });
                });
                responses.forEach(r => {
                  if (r.member_email && !participantMap.has(r.member_email)) {
                    participantMap.set(r.member_email, { name: r.member_name || '', email: r.member_email });
                  }
                });
                const participants = Array.from(participantMap.values());
                if (participants.length === 0) return null;
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {vi ? 'Mời tham gia:' : 'Invite:'}
                    </label>
                    <div className="space-y-1.5">
                      {participants.map((p) => (
                        <label key={p.email} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedEmails.includes(p.email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmails(prev => [...prev, p.email]);
                              } else {
                                setSelectedEmails(prev => prev.filter(em => em !== p.email));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">{p.name}</span>
                          <span className="text-gray-400 text-xs">{p.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
              onClick={() => setConfirmCancelDiscussionOpen(true)}
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

      <ConfirmModal
        open={confirmClearVotesOpen}
        title={vi ? 'Xóa phản hồi?' : 'Remove your response?'}
        message={
          vi
            ? 'Toàn bộ phiếu bầu của bạn sẽ bị xóa và bạn sẽ trở lại trạng thái chưa bỏ phiếu.'
            : 'All your votes will be removed and you will return to the not-voted state.'
        }
        confirmLabel={vi ? 'Xóa phản hồi' : 'Remove Response'}
        cancelLabel={vi ? 'Hủy' : 'Cancel'}
        variant="danger"
        onConfirm={async () => {
          setConfirmClearVotesOpen(false);
          await handleSubmitResponse();
          setIsEditing(false);
        }}
        onCancel={() => setConfirmClearVotesOpen(false)}
      />

      <ConfirmModal
        open={confirmCancelDiscussionOpen}
        title={vi ? 'Hủy phiên bỏ phiếu?' : 'Cancel this vote?'}
        message={
          vi
            ? 'Tất cả phiếu bầu sẽ bị xóa và không thể hoàn tác.'
            : 'All votes will be lost and this cannot be undone.'
        }
        confirmLabel={vi ? 'Hủy phiên bỏ phiếu' : 'Cancel Vote'}
        cancelLabel={vi ? 'Quay lại' : 'Go Back'}
        variant="danger"
        onConfirm={() => {
          setConfirmCancelDiscussionOpen(false);
          handleUpdateStatus('cancelled');
        }}
        onCancel={() => setConfirmCancelDiscussionOpen(false)}
      />
    </div>
  );
}

// ==================== Scheduled View ====================

function ScheduledView({
  discussion,
  isCreator,
  isAdmin,
  submitting,
  vi,
  proposalId,
  formatMeetingDateTime,
  handleUpdateStatus,
  setSubmitting,
  setError,
  onRefresh,
}: {
  discussion: ProposalDiscussion;
  isCreator: boolean;
  isAdmin: boolean;
  submitting: boolean;
  vi: boolean;
  proposalId: string;
  formatMeetingDateTime: (d: string) => string;
  handleUpdateStatus: (status: 'completed' | 'cancelled' | 'open') => void;
  setSubmitting: (v: boolean) => void;
  setError: (v: string) => void;
  onRefresh: () => void;
}) {
  const [showEmails, setShowEmails] = useState(false);
  const [showDateChange, setShowDateChange] = useState(false);
  const [newDate, setNewDate] = useState(discussion.meeting_date?.split('T')[0] || '');
  const [newTime, setNewTime] = useState(() => {
    const match = discussion.meeting_date?.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '20:00';
  });
  const [newLink, setNewLink] = useState(discussion.meeting_link || '');
  const [newPlatform, setNewPlatform] = useState<MeetingPlatform>(discussion.meeting_platform || 'meet');
  const [reminderSent, setReminderSent] = useState(false);
  const [showCancelFlow, setShowCancelFlow] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPreview, setShowCancelPreview] = useState(false);
  const [confirmRevertOpen, setConfirmRevertOpen] = useState(false);

  const canManage = isCreator || isAdmin;

  async function handleSendReminder() {
    setSubmitting(true);
    setReminderSent(false);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_reminder' }),
      });
      if (!res.ok) throw new Error();
      setReminderSent(true);
    } catch {
      setError(vi ? 'Không thể gửi nhắc nhở' : 'Failed to send reminder');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateMeeting() {
    if (!newDate || !newTime) return;
    setSubmitting(true);
    try {
      const meeting_date = `${newDate}T${newTime}:00+07:00`;
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_meeting',
          meeting_date,
          ...(newLink !== discussion.meeting_link ? { meeting_link: newLink } : {}),
          ...(newPlatform !== (discussion.meeting_platform || 'meet') ? { meeting_platform: newPlatform } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      setShowDateChange(false);
      onRefresh();
    } catch {
      setError(vi ? 'Không thể cập nhật lịch' : 'Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelWithReason() {
    if (!cancelReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', reason: cancelReason.trim() }),
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const formattedMeetingDate = discussion.meeting_date
    ? new Date(discussion.meeting_date).toLocaleString(vi ? 'vi-VN' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
      })
    : '';

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

        {/* Invited emails — clickable for admin/creator */}
        {discussion.invited_emails && discussion.invited_emails.length > 0 && (
          <div>
            <button
              onClick={() => canManage && setShowEmails(!showEmails)}
              className={`text-sm font-medium mb-1 ${canManage ? 'text-blue-600 hover:text-blue-700 cursor-pointer' : 'text-gray-700 cursor-default'}`}
            >
              {vi ? `${discussion.invited_emails.length} người được mời` : `${discussion.invited_emails.length} invited`}
              {canManage && (
                <span className="ml-1">{showEmails ? '▲' : '▼'}</span>
              )}
            </button>
            {showEmails && canManage && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 space-y-1.5">
                {discussion.invited_emails.map((email) => (
                  <div key={email} className="flex items-center gap-2 text-sm">
                    <a
                      href={`mailto:${email}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {email}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin/Creator actions */}
      {canManage && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSendReminder}
              disabled={submitting}
              className="text-sm px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? (vi ? 'Đang gửi...' : 'Sending...') : (vi ? 'Gửi nhắc nhở' : 'Send Reminder')}
            </button>
            <button
              onClick={() => setShowDateChange(!showDateChange)}
              className="text-sm px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
            >
              {vi ? 'Đổi ngày' : 'Change Date'}
            </button>
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={submitting}
              className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {vi ? 'Đánh dấu hoàn thành' : 'Mark Completed'}
            </button>
            <button
              onClick={() => setConfirmRevertOpen(true)}
              disabled={submitting}
              className="text-sm px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50"
            >
              {vi ? 'Quay lại bình chọn ngày' : 'Revert to Date Poll'}
            </button>
            <button
              onClick={() => { setShowCancelFlow(!showCancelFlow); setShowCancelPreview(false); setCancelReason(''); }}
              className="text-sm px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              {vi ? 'Hủy buổi thảo luận' : 'Cancel Discussion'}
            </button>
          </div>

          {reminderSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <span>✓</span> {vi ? 'Đã gửi nhắc nhở cho tất cả thành viên đã cam kết' : 'Reminder sent to every committed member'}
              </p>
            </div>
          )}

          {/* Cancel discussion flow */}
          {showCancelFlow && !showCancelPreview && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-lg mt-0.5">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {vi ? 'Hủy buổi thảo luận' : 'Cancel Discussion'}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {vi
                      ? `Hành động này không thể hoàn tác. Email thông báo hủy sẽ được gửi đến ${discussion.invited_emails?.length || 0} người được mời.`
                      : `This action cannot be undone. A cancellation email will be sent to ${discussion.invited_emails?.length || 0} invited member(s).`}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-800 mb-1">
                  {vi ? 'Lý do hủy *' : 'Reason for cancellation *'}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={vi ? 'Vui lòng nêu rõ lý do hủy buổi thảo luận...' : 'Please explain why this discussion is being cancelled...'}
                  rows={3}
                  className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (cancelReason.trim()) setShowCancelPreview(true); }}
                  disabled={!cancelReason.trim()}
                  className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {vi ? 'Xem trước email' : 'Preview Email'}
                </button>
                <button
                  onClick={() => { setShowCancelFlow(false); setCancelReason(''); }}
                  className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {vi ? 'Quay lại' : 'Go Back'}
                </button>
              </div>
            </div>
          )}

          {/* Cancel email preview */}
          {showCancelFlow && showCancelPreview && (
            <div className="bg-white border border-red-200 rounded-xl p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-800">
                {vi ? 'Xem trước email sẽ gửi cho người được mời:' : 'Preview of email to be sent to invited members:'}
              </p>

              {/* Email preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Email header */}
                <div className="bg-red-600 px-5 py-3">
                  <p className="text-white font-semibold text-sm">
                    {vi ? 'Buổi thảo luận đã bị hủy' : 'Discussion Cancelled'}
                  </p>
                </div>
                {/* Email body */}
                <div className="px-5 py-4 space-y-3 text-sm">
                  <p className="font-bold text-gray-900">
                    {vi ? 'Xin chào [Tên người nhận]!' : 'Hello [Recipient Name]!'}
                  </p>
                  <p className="text-gray-700">
                    {vi
                      ? 'Buổi thảo luận trực tuyến cho đề xuất sau đã bị hủy:'
                      : 'The online discussion for the following proposal has been cancelled:'}
                  </p>

                  {/* Proposal info */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-semibold text-red-800 text-sm">[{vi ? 'Tên đề xuất' : 'Proposal Title'}]</p>
                    <p className="text-gray-500 text-xs mt-1">
                      <span className="font-medium">{vi ? 'Thời gian dự kiến:' : 'Scheduled time:'}</span>{' '}
                      <span className="line-through">{formattedMeetingDate}</span>
                    </p>
                  </div>

                  {/* Reason */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-semibold text-yellow-800 text-xs mb-1">{vi ? 'Lý do hủy:' : 'Reason for cancellation:'}</p>
                    <p className="text-yellow-900 text-sm">{cancelReason}</p>
                  </div>
                </div>
                {/* Email footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-400 text-center">ABG Alumni Connect</p>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {vi
                  ? `Email này sẽ được gửi đến ${discussion.invited_emails?.length || 0} người: ${discussion.invited_emails?.join(', ')}`
                  : `This email will be sent to ${discussion.invited_emails?.length || 0} people: ${discussion.invited_emails?.join(', ')}`}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleCancelWithReason}
                  disabled={submitting}
                  className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting
                    ? (vi ? 'Đang hủy...' : 'Cancelling...')
                    : (vi ? 'Xác nhận hủy & Gửi email' : 'Confirm Cancel & Send Email')}
                </button>
                <button
                  onClick={() => setShowCancelPreview(false)}
                  className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {vi ? 'Sửa lý do' : 'Edit Reason'}
                </button>
                <button
                  onClick={() => { setShowCancelFlow(false); setShowCancelPreview(false); setCancelReason(''); }}
                  className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {vi ? 'Quay lại' : 'Go Back'}
                </button>
              </div>
            </div>
          )}

          {/* Date change form */}
          {showDateChange && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">{vi ? 'Đổi ngày & giờ' : 'Change Date & Time'}</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{vi ? 'Ngày' : 'Date'} *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{vi ? 'Giờ' : 'Time'} *</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{vi ? 'Nền tảng' : 'Platform'}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(['meet', 'zoom', 'other'] as MeetingPlatform[]).map((p) => (
                    <label
                      key={p}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                        newPlatform === p
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reschedule-platform"
                        value={p}
                        checked={newPlatform === p}
                        onChange={() => setNewPlatform(p)}
                        className="sr-only"
                      />
                      {p === 'meet' && 'Google Meet'}
                      {p === 'zoom' && 'Zoom'}
                      {p === 'other' && (vi ? 'Khác' : 'Other')}
                    </label>
                  ))}
                </div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {newPlatform === 'meet'
                    ? 'Google Meet Link'
                    : newPlatform === 'zoom'
                      ? (vi ? 'Link Zoom' : 'Zoom Link')
                      : (vi ? 'Link tham gia' : 'Meeting Link')}
                </label>
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder={
                    newPlatform === 'meet'
                      ? 'https://meet.google.com/xxx-xxxx-xxx'
                      : newPlatform === 'zoom'
                        ? 'https://us02web.zoom.us/j/...'
                        : 'https://...'
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateMeeting}
                  disabled={submitting}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (vi ? 'Đang cập nhật...' : 'Updating...') : (vi ? 'Cập nhật & Gửi thông báo' : 'Update & Notify')}
                </button>
                <button
                  onClick={() => setShowDateChange(false)}
                  className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {vi ? 'Hủy' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmRevertOpen}
        title={vi ? 'Quay lại bình chọn ngày?' : 'Revert to date poll?'}
        message={
          vi
            ? 'Lịch họp hiện tại sẽ bị xóa và mọi người sẽ có thể bỏ phiếu lại cho các ngày đề xuất.'
            : 'The current scheduled meeting will be removed and members will be able to vote on the date options again.'
        }
        confirmLabel={vi ? 'Quay lại bình chọn' : 'Revert to Poll'}
        cancelLabel={vi ? 'Hủy' : 'Cancel'}
        variant="warning"
        onConfirm={() => {
          setConfirmRevertOpen(false);
          handleUpdateStatus('open');
        }}
        onCancel={() => setConfirmRevertOpen(false)}
      />
    </div>
  );
}

// ==================== Send Update Section ====================

function SendUpdateSection({
  proposalId,
  commitments,
  vi,
  onError,
}: {
  proposalId: string;
  commitments: CommunityCommitment[];
  vi: boolean;
  onError: (msg: string) => void;
}) {
  // Recipients: everyone with a commitment row (Quan tâm / Sẽ tham gia /
  // Sẽ dẫn dắt). Commenters are excluded — they never registered a
  // commitment level. Only the project formation flow narrows further
  // to participate/lead.
  const recipientCount = commitments.length;
  const recipientEmails = commitments
    .map((c) => c.member_email)
    .filter((e): e is string => !!e);

  const [showFlow, setShowFlow] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  if (recipientCount === 0) return null;

  async function handleSend() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/discussion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_update',
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      setSentCount(typeof data.count === 'number' ? data.count : recipientCount);
      setShowFlow(false);
      setShowPreview(false);
      setSubject('');
      setMessage('');
    } catch {
      onError(vi ? 'Không thể gửi cập nhật' : 'Failed to send update');
    } finally {
      setSubmitting(false);
    }
  }

  if (!showFlow) {
    return (
      <div className="space-y-3">
        <div>
          <button
            onClick={() => { setShowFlow(true); setSentCount(null); }}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"
          >
            <span>📨</span>
            {vi ? `Gửi cập nhật (${recipientCount} người)` : `Send Update (${recipientCount} people)`}
          </button>
          <p className="mt-1 text-xs text-gray-500">
            {vi
              ? 'Soạn email tùy chỉnh gửi đến tất cả thành viên đã cam kết (Quan tâm, Sẽ tham gia, Sẽ dẫn dắt).'
              : 'Compose a custom email to every member who committed (Interested, Will Participate, Will Lead).'}
          </p>
        </div>
        {sentCount !== null && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <span>✓</span>
              {vi
                ? `Đã gửi email cập nhật đến ${sentCount} người`
                : `Update email sent to ${sentCount} participant(s)`}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!showPreview) {
    return (
      <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-500 text-lg mt-0.5">📨</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {vi ? 'Soạn email cập nhật' : 'Compose update email'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {vi
                ? `Email sẽ được gửi đến ${recipientCount} thành viên đã cam kết.`
                : `Email will be sent to ${recipientCount} committed member(s).`}
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {vi ? 'Tiêu đề (tùy chọn)' : 'Subject (optional)'}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder={vi ? 'VD: Tóm tắt buổi thảo luận' : 'e.g. Discussion recap'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {vi ? 'Nội dung *' : 'Message *'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={vi ? 'Nhập nội dung cập nhật...' : 'Write your update...'}
            rows={6}
            maxLength={5000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">{message.length}/5000</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (message.trim()) setShowPreview(true); }}
            disabled={!message.trim()}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {vi ? 'Xem trước email' : 'Preview Email'}
          </button>
          <button
            onClick={() => { setShowFlow(false); setSubject(''); setMessage(''); }}
            className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {vi ? 'Hủy' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-4">
      <p className="text-sm font-semibold text-gray-800">
        {vi ? 'Xem trước email sẽ gửi cho thành viên đã cam kết:' : 'Preview of email to be sent to committed members:'}
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-600 px-5 py-3">
          <p className="text-white font-semibold text-sm">
            {vi ? 'Cập nhật từ người tổ chức' : 'Update from the organizer'}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <p className="font-bold text-gray-900">
            {vi ? 'Xin chào [Tên người nhận]!' : 'Hello [Recipient Name]!'}
          </p>
          <p className="text-gray-700">
            {vi
              ? 'Bạn có một cập nhật về buổi thảo luận cho đề xuất:'
              : 'You have an update about the discussion for the proposal:'}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-800 text-sm">[{vi ? 'Tên đề xuất' : 'Proposal Title'}]</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-gray-900 text-sm whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">ABG Alumni Connect</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {vi
          ? `Email này sẽ được gửi đến ${recipientCount} thành viên đã cam kết: ${recipientEmails.join(', ')}`
          : `This email will be sent to ${recipientCount} committed member(s): ${recipientEmails.join(', ')}`}
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSend}
          disabled={submitting}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting
            ? (vi ? 'Đang gửi...' : 'Sending...')
            : (vi ? 'Xác nhận & Gửi email' : 'Confirm & Send Email')}
        </button>
        <button
          onClick={() => setShowPreview(false)}
          disabled={submitting}
          className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {vi ? 'Sửa nội dung' : 'Edit Message'}
        </button>
        <button
          onClick={() => { setShowFlow(false); setShowPreview(false); setSubject(''); setMessage(''); }}
          disabled={submitting}
          className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {vi ? 'Quay lại' : 'Go Back'}
        </button>
      </div>
    </div>
  );
}
