'use client';

import { useState, useEffect } from 'react';

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  locale: string;
  onSuccess?: () => void;
}

export function EventEmailInviteSection({
  eventId,
  eventTitle,
  eventDate,
  locale,
  onSuccess,
}: Props) {
  const vi = locale === 'vi';

  const [showPanel, setShowPanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('20:00');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [participants, setParticipants] = useState<{ name: string; email: string }[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill date from event date
  useEffect(() => {
    if (eventDate) {
      try {
        const d = new Date(eventDate);
        setMeetingDate(d.toISOString().split('T')[0]);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        setMeetingTime(`${hours}:${minutes}`);
      } catch { /* ignore */ }
    }
  }, [eventDate]);

  async function fetchParticipants() {
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/community/events/${eventId}/invite`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
        setSelectedEmails((data.participants || []).map((p: { email: string }) => p.email));
      }
    } catch {
      // ignore
    } finally {
      setLoadingParticipants(false);
    }
  }

  async function handleSendInvites() {
    if (!meetingDate || !meetingTime) {
      setError(vi ? 'Vui l\u00f2ng ch\u1ecdn ng\u00e0y v\u00e0 gi\u1edd' : 'Please select date and time');
      return;
    }
    if (!meetingLink) {
      setError(vi ? 'Vui l\u00f2ng nh\u1eadp link Google Meet' : 'Please enter Google Meet link');
      return;
    }
    if (!meetingLink.startsWith('https://meet.google.com/')) {
      setError(vi ? 'Vui l\u00f2ng nh\u1eadp link Google Meet h\u1ee3p l\u1ec7' : 'Please enter a valid Google Meet link');
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
      const res = await fetch(`/api/community/events/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: meetingDateTime,
          meeting_link: meetingLink,
          invited_emails: selectedEmails,
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
      onSuccess?.();
    } catch {
      setError(vi ? 'C\u00f3 l\u1ed7i x\u1ea3y ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {!showPanel && (
        <button
          onClick={() => {
            setShowPanel(true);
            setError('');
            setSuccessMsg('');
            fetchParticipants();
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {vi ? 'G\u1eedi l\u1eddi m\u1eddi email & l\u1ecbch h\u1ecdn' : 'Send Email Invite & Calendar'}
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

          {/* Google Meet Link */}
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
                {vi ? 'T\u1ea1o Meet' : 'Create Meet'}
              </a>
            </div>
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

          {/* Invite list */}
          {loadingParticipants ? (
            <div className="text-sm text-gray-500 py-2">
              {vi ? '\u0110ang t\u1ea3i danh s\u00e1ch...' : 'Loading participants...'}
            </div>
          ) : participants.length > 0 ? (
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
                  ? 'Ch\u01b0a c\u00f3 ai \u0111\u0103ng k\u00fd tham gia s\u1ef1 ki\u1ec7n.'
                  : 'No RSVPs yet.'}
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
