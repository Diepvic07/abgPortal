'use client';

import { useState, useMemo } from 'react';
import { CommunityCommitment } from '@/types';
import { MeetingPlatform, normalizeMeetingLink } from '@/lib/meeting-link';

interface Props {
  proposalId: string;
  proposalTitle: string;
  commitments: CommunityCommitment[];
  isCreator: boolean;
  isAdmin?: boolean;
  locale: string;
  onRefresh: () => void;
}

export function ProposalEmailInviteSection({
  proposalId,
  proposalTitle,
  commitments,
  isCreator,
  isAdmin = false,
  locale,
  onRefresh,
}: Props) {
  const vi = locale === 'vi';
  const canManage = isCreator || isAdmin;

  const defaultSubject = vi
    ? `Lời mời thảo luận: ${proposalTitle}`
    : `Discussion Invitation: ${proposalTitle}`;
  const defaultIntro = vi
    ? 'Bạn được mời tham gia buổi thảo luận trực tuyến cho đề xuất:'
    : 'You are invited to join an online discussion for the proposal:';

  const [showPanel, setShowPanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('20:00');
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>('meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailIntro, setEmailIntro] = useState(defaultIntro);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Build participant list from commitments
  const participants = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    commitments.forEach(c => {
      if (c.member_email) {
        map.set(c.member_email, { name: c.member_name || '', email: c.member_email });
      }
    });
    return Array.from(map.values());
  }, [commitments]);

  if (!canManage) return null;

  async function handleSendInvites() {
    if (!meetingDate || !meetingTime) {
      setError(vi ? 'Vui l\u00f2ng ch\u1ecdn ng\u00e0y v\u00e0 gi\u1edd' : 'Please select date and time');
      return;
    }
    if (!meetingLink) {
      setError(vi ? 'Vui l\u00f2ng nh\u1eadp link tham gia' : 'Please enter a meeting link');
      return;
    }
    const normalizedLink = normalizeMeetingLink(meetingLink);
    if (!normalizedLink) {
      setError(vi ? 'Vui l\u00f2ng nh\u1eadp link HTTPS h\u1ee3p l\u1ec7' : 'Please enter a valid HTTPS meeting link');
      return;
    }
    if (meetingPlatform === 'meet' && !normalizedLink.startsWith('https://meet.google.com/')) {
      setError(vi ? 'Link kh\u00f4ng ph\u1ea3i Google Meet. Vui l\u00f2ng \u0111\u1ed5i n\u1ec1n t\u1ea3ng ho\u1eb7c d\u00e1n link Meet h\u1ee3p l\u1ec7.' : 'Not a Google Meet link. Switch platform or paste a valid Meet link.');
      return;
    }
    if (meetingPlatform === 'zoom' && !/zoom\.(us|com)/i.test(normalizedLink)) {
      setError(vi ? 'Link kh\u00f4ng ph\u1ea3i Zoom. Vui l\u00f2ng \u0111\u1ed5i n\u1ec1n t\u1ea3ng ho\u1eb7c d\u00e1n link Zoom h\u1ee3p l\u1ec7.' : 'Not a Zoom link. Switch platform or paste a valid Zoom link.');
      return;
    }
    if (selectedEmails.length === 0) {
      setError(vi ? 'Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t 1 ng\u01b0\u1eddi \u0111\u1ec3 m\u1eddi' : 'Please select at least 1 person to invite');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const meetingDateTime = `${meetingDate}T${meetingTime}:00+07:00`;
      const res = await fetch(`/api/community/proposals/${proposalId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: meetingDateTime,
          meeting_link: normalizedLink,
          meeting_platform: meetingPlatform,
          meeting_id: meetingPlatform === 'meet' ? '' : meetingId.trim(),
          meeting_passcode: meetingPlatform === 'meet' ? '' : meetingPasscode.trim(),
          invited_emails: selectedEmails,
          email_subject: emailSubject.trim(),
          email_intro: emailIntro.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || (vi ? 'L\u1ed7i g\u1eedi l\u1eddi m\u1eddi' : 'Failed to send invitations'));
        return;
      }

      setSuccessMsg(
        vi
          ? `\u0110\u00e3 g\u1eedi l\u1eddi m\u1eddi \u0111\u1ebfn ${selectedEmails.length} ng\u01b0\u1eddi v\u1edbi l\u1ecbch Google Calendar & nh\u1eafc nh\u1edf!`
          : `Invitations sent to ${selectedEmails.length} people with Google Calendar & reminders!`
      );
      setShowPanel(false);
      onRefresh();
    } catch {
      setError(vi ? 'C\u00f3 l\u1ed7i x\u1ea3y ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        {vi ? 'G\u1eedi l\u1eddi m\u1eddi' : 'Send Invitations'}
      </h3>

      {!showPanel && (
        <button
          onClick={() => {
            setShowPanel(true);
            setError('');
            setSuccessMsg('');
            // Pre-select all participant emails
            const emails = participants.map(p => p.email);
            setSelectedEmails(emails);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {vi ? 'G\u1eedi l\u1eddi m\u1eddi email & l\u1ecbch h\u1ecdp' : 'Send Email Invite & Calendar'}
        </button>
      )}

      {showPanel && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">📧</span>
            {vi ? 'G\u1eedi l\u1eddi m\u1eddi v\u1edbi l\u1ecbch Google Calendar' : 'Send Invite with Google Calendar'}
          </h4>

          <p className="text-sm text-gray-500">
            {vi
              ? 'Ng\u01b0\u1eddi \u0111\u01b0\u1ee3c m\u1eddi s\u1ebd nh\u1eadn email v\u1edbi file .ics \u0111\u1ec3 th\u00eam v\u00e0o Google Calendar, k\u00e8m 2 nh\u1eafc nh\u1edf (30 ph\u00fat v\u00e0 10 ph\u00fat tr\u01b0\u1edbc).'
              : 'Invitees will receive an email with .ics file to add to Google Calendar, with 2 reminders (30min and 10min before).'}
          </p>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {vi ? 'Ng\u00e0y' : 'Date'} *
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
                {vi ? 'Gi\u1edd' : 'Time'} *
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
          </div>

          {/* Platform + Meeting Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {vi ? 'N\u1ec1n t\u1ea3ng h\u1ecdp' : 'Meeting platform'} *
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
                    name="meeting-platform"
                    value={p}
                    checked={meetingPlatform === p}
                    onChange={() => setMeetingPlatform(p)}
                    className="sr-only"
                  />
                  {p === 'meet' && (vi ? 'Google Meet' : 'Google Meet')}
                  {p === 'zoom' && 'Zoom'}
                  {p === 'other' && (vi ? 'Kh\u00e1c' : 'Other')}
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
                  {vi ? 'T\u1ea1o Meet' : 'Create Meet'}
                </a>
              )}
              {meetingPlatform === 'zoom' && (
                <a
                  href="https://zoom.us/start/videomeeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap border border-gray-300"
                >
                  {vi ? 'M\u1edf Zoom' : 'Open Zoom'}
                </a>
              )}
            </div>

            {meetingPlatform !== 'meet' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Meeting ID <span className="text-gray-400">({vi ? 'tu\u1ef3 ch\u1ecdn' : 'optional'})</span>
                  </label>
                  <input
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="814 4269 2029"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {vi ? 'M\u1eadt kh\u1ea9u' : 'Passcode'} <span className="text-gray-400">({vi ? 'tu\u1ef3 ch\u1ecdn' : 'optional'})</span>
                  </label>
                  <input
                    type="text"
                    value={meetingPasscode}
                    onChange={(e) => setMeetingPasscode(e.target.value)}
                    placeholder="421300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reminders info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <span>🔔</span>
              {vi
                ? '2 nh\u1eafc nh\u1edf s\u1ebd \u0111\u01b0\u1ee3c t\u1ef1 \u0111\u1ed9ng th\u00eam v\u00e0o l\u1ecbch: 30 ph\u00fat v\u00e0 10 ph\u00fat tr\u01b0\u1edbc s\u1ef1 ki\u1ec7n.'
                : '2 reminders will be auto-added to calendar: 30 minutes and 10 minutes before the event.'}
            </p>
          </div>

          {/* Email content editor (collapsible) */}
          <div className="border border-gray-200 rounded-lg bg-white">
            <button
              type="button"
              onClick={() => setShowEmailEditor(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <span className="flex items-center gap-2">
                <span>✉️</span>
                {vi ? 'Xem/Sửa nội dung email' : 'View/Edit email content'}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showEmailEditor ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showEmailEditor && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {vi ? 'Tiêu đề' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {vi ? 'Lời nhắn' : 'Message'}
                  </label>
                  <textarea
                    value={emailIntro}
                    onChange={(e) => setEmailIntro(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm resize-y"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {vi
                      ? 'Thông tin cuộc họp, nút tham gia và footer được tự động thêm vào.'
                      : 'Meeting details, join button, and footer are auto-included.'}
                  </p>
                  {(emailSubject !== defaultSubject || emailIntro !== defaultIntro) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSubject(defaultSubject);
                        setEmailIntro(defaultIntro);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      {vi ? 'Khôi phục mặc định' : 'Restore default'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Invite list */}
          {participants.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {vi ? 'M\u1eddi tham gia:' : 'Invite:'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmails.length === participants.length) {
                      setSelectedEmails([]);
                    } else {
                      setSelectedEmails(participants.map(p => p.email));
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedEmails.length === participants.length
                    ? (vi ? 'B\u1ecf ch\u1ecdn t\u1ea5t c\u1ea3' : 'Deselect all')
                    : (vi ? 'Ch\u1ecdn t\u1ea5t c\u1ea3' : 'Select all')}
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {participants.map((p) => (
                  <label key={p.email} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
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
                    <span className="text-gray-700 font-medium">{p.name}</span>
                    <span className="text-gray-400 text-xs">{p.email}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {vi
                  ? `\u0110\u00e3 ch\u1ecdn ${selectedEmails.length}/${participants.length} ng\u01b0\u1eddi`
                  : `${selectedEmails.length}/${participants.length} selected`}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">
                {vi
                  ? 'Ch\u01b0a c\u00f3 ai cam k\u1ebft tham gia. H\u00e3y ch\u1edd th\u00eam th\u00e0nh vi\u00ean \u0111\u0103ng k\u00fd tr\u01b0\u1edbc khi g\u1eedi l\u1eddi m\u1eddi.'
                  : 'No commitments yet. Wait for members to sign up before sending invitations.'}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSendInvites}
              disabled={submitting || selectedEmails.length === 0}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
            >
              {submitting
                ? (vi ? '\u0110ang g\u1eedi...' : 'Sending...')
                : (vi ? `G\u1eedi l\u1eddi m\u1eddi (${selectedEmails.length})` : `Send Invitations (${selectedEmails.length})`)}
            </button>
            <button
              onClick={() => {
                setShowPanel(false);
                setError('');
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              {vi ? 'H\u1ee7y' : 'Cancel'}
            </button>
          </div>
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
