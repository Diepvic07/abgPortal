'use client';

import { useState, useEffect } from 'react';
import { normalizeMeetingLink, MeetingPlatform } from '@/lib/meeting-link';

type InviteMode = 'online' | 'offline';

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  eventLocationUrl?: string;
  eventMode?: 'online' | 'offline' | 'hybrid';
  locale: string;
  onSuccess?: () => void;
}

export function EventEmailInviteSection({
  eventId,
  eventTitle,
  eventDate,
  eventEndDate,
  eventLocation,
  eventLocationUrl,
  eventMode,
  locale,
  onSuccess,
}: Props) {
  const vi = locale === 'vi';
  const initialMode: InviteMode = eventMode === 'offline' ? 'offline' : 'online';

  const defaultSubject = vi
    ? `Lời mời tham gia sự kiện: ${eventTitle}`
    : `Event Invitation: ${eventTitle}`;
  const buildDefaultIntro = (m: InviteMode) => m === 'offline'
    ? (vi ? 'Bạn được mời tham gia sự kiện:' : 'You are invited to join the event:')
    : (vi ? 'Bạn được mời tham gia sự kiện trực tuyến:' : 'You are invited to join the online event:');

  const [showPanel, setShowPanel] = useState(false);
  const [mode, setMode] = useState<InviteMode>(initialMode);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('20:00');
  const [meetingEndDate, setMeetingEndDate] = useState('');
  const [meetingEndTime, setMeetingEndTime] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>('meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [participants, setParticipants] = useState<{ name: string; email: string; is_guest?: boolean }[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailIntro, setEmailIntro] = useState(buildDefaultIntro(initialMode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pre-fill start date/time from event.event_date
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

  // Pre-fill end date/time from event.event_end_date
  useEffect(() => {
    if (eventEndDate) {
      try {
        const d = new Date(eventEndDate);
        setMeetingEndDate(d.toISOString().split('T')[0]);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        setMeetingEndTime(`${hours}:${minutes}`);
      } catch { /* ignore */ }
    }
  }, [eventEndDate]);

  // Pre-fill location fields from the event
  useEffect(() => { if (eventLocation) setLocation(eventLocation); }, [eventLocation]);
  useEffect(() => { if (eventLocationUrl) setLocationUrl(eventLocationUrl); }, [eventLocationUrl]);

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
      setError(vi ? 'Vui l\u00f2ng ch\u1ecdn ng\u00e0y v\u00e0 gi\u1edd b\u1eaft \u0111\u1ea7u' : 'Please select start date and time');
      return;
    }
    if (meetingEndDate && meetingEndTime) {
      const start = new Date(`${meetingDate}T${meetingTime}:00+07:00`).getTime();
      const end = new Date(`${meetingEndDate}T${meetingEndTime}:00+07:00`).getTime();
      if (end <= start) {
        setError(vi ? 'Th\u1eddi gian k\u1ebft th\u00fac ph\u1ea3i sau th\u1eddi gian b\u1eaft \u0111\u1ea7u' : 'End time must be after start time');
        return;
      }
    }

    let normalizedMeetingLink = '';
    let normalizedLocationUrl = '';

    if (mode === 'online') {
      if (!meetingLink) {
        setError(vi ? 'Vui l\u00f2ng nh\u1eadp link tham gia' : 'Please enter a meeting link');
        return;
      }
      const nl = normalizeMeetingLink(meetingLink);
      if (!nl) {
        setError(vi ? 'Vui l\u00f2ng nh\u1eadp link HTTPS h\u1ee3p l\u1ec7' : 'Please enter a valid HTTPS meeting link');
        return;
      }
      if (meetingPlatform === 'meet' && !nl.startsWith('https://meet.google.com/')) {
        setError(vi ? 'Link kh\u00f4ng ph\u1ea3i Google Meet. Vui l\u00f2ng \u0111\u1ed5i n\u1ec1n t\u1ea3ng ho\u1eb7c d\u00e1n link Meet h\u1ee3p l\u1ec7.' : 'Not a Google Meet link. Switch platform or paste a valid Meet link.');
        return;
      }
      if (meetingPlatform === 'zoom' && !/zoom\.(us|com)/i.test(nl)) {
        setError(vi ? 'Link kh\u00f4ng ph\u1ea3i Zoom. Vui l\u00f2ng \u0111\u1ed5i n\u1ec1n t\u1ea3ng ho\u1eb7c d\u00e1n link Zoom h\u1ee3p l\u1ec7.' : 'Not a Zoom link. Switch platform or paste a valid Zoom link.');
        return;
      }
      normalizedMeetingLink = nl;
    } else {
      if (!location.trim()) {
        setError(vi ? 'Vui l\u00f2ng nh\u1eadp \u0111\u1ecba \u0111i\u1ec3m' : 'Please enter a location');
        return;
      }
      if (locationUrl.trim()) {
        const nl = normalizeMeetingLink(locationUrl.trim());
        if (!nl) {
          setError(vi ? 'Link Google Maps kh\u00f4ng h\u1ee3p l\u1ec7 (c\u1ea7n HTTPS)' : 'Google Maps link is invalid (needs HTTPS)');
          return;
        }
        normalizedLocationUrl = nl;
      }
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
      const meetingEndDateTime = meetingEndDate && meetingEndTime
        ? `${meetingEndDate}T${meetingEndTime}:00+07:00`
        : '';
      const res = await fetch(`/api/community/events/${eventId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_mode: mode,
          meeting_date: meetingDateTime,
          meeting_end_date: meetingEndDateTime || undefined,
          meeting_link: mode === 'online' ? normalizedMeetingLink : '',
          meeting_platform: mode === 'online' ? meetingPlatform : undefined,
          meeting_id: mode === 'online' && meetingPlatform !== 'meet' ? meetingId.trim() : '',
          meeting_passcode: mode === 'online' && meetingPlatform !== 'meet' ? meetingPasscode.trim() : '',
          location: mode === 'offline' ? location.trim() : '',
          location_url: mode === 'offline' ? normalizedLocationUrl : '',
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

          {/* Mode toggle: offline vs online */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {vi ? 'H\u00ecnh th\u1ee9c s\u1ef1 ki\u1ec7n' : 'Event type'} *
            </label>
            <div className="flex flex-wrap gap-2">
              {(['online', 'offline'] as InviteMode[]).map((m) => (
                <label
                  key={m}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    mode === m
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="event-invite-mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => {
                      setMode(m);
                      // Refresh the default intro text if user hasn't customized it
                      const prevDefault = buildDefaultIntro(mode);
                      if (emailIntro === prevDefault) setEmailIntro(buildDefaultIntro(m));
                    }}
                    className="sr-only"
                  />
                  {m === 'online'
                    ? (vi ? 'Tr\u1ef1c tuy\u1ebfn' : 'Online')
                    : (vi ? 'Tr\u1ef1c ti\u1ebfp (Offline)' : 'In-person (Offline)')}
                </label>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {vi ? 'Ng\u00e0y b\u1eaft \u0111\u1ea7u' : 'Start date'} *
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
                {vi ? 'Gi\u1edd b\u1eaft \u0111\u1ea7u' : 'Start time'} *
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {vi ? 'Ng\u00e0y k\u1ebft th\u00fac' : 'End date'}
                <span className="text-gray-400 font-normal ml-1">
                  ({vi ? 'tu\u1ef3 ch\u1ecdn' : 'optional'})
                </span>
              </label>
              <input
                type="date"
                value={meetingEndDate}
                onChange={(e) => setMeetingEndDate(e.target.value)}
                min={meetingDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {vi ? 'Gi\u1edd k\u1ebft th\u00fac' : 'End time'}
                <span className="text-gray-400 font-normal ml-1">
                  ({vi ? 'tu\u1ef3 ch\u1ecdn' : 'optional'})
                </span>
              </label>
              <input
                type="time"
                value={meetingEndTime}
                onChange={(e) => setMeetingEndTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
          </div>
          {!meetingEndDate && !meetingEndTime && (
            <p className="text-xs text-gray-500 -mt-2">
              {vi
                ? 'B\u1ecf tr\u1ed1ng n\u1ebfu kh\u00f4ng r\u00f5 gi\u1edd k\u1ebft th\u00fac \u2014 m\u1eb7c \u0111\u1ecbnh 60 ph\u00fat sau gi\u1edd b\u1eaft \u0111\u1ea7u.'
                : 'Leave blank if unsure \u2014 defaults to 60 minutes after the start time.'}
            </p>
          )}

          {/* Offline location fields */}
          {mode === 'offline' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {vi ? '\u0110\u1ecba \u0111i\u1ec3m' : 'Location'} *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={vi ? 'VD: Nh\u00e0 h\u00e0ng ABC, 123 Nguy\u1ec5n Hu\u1ec7, Q.1, TP.HCM' : 'e.g. ABC Restaurant, 123 Main St, HCMC'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {vi ? 'Link Google Maps' : 'Google Maps link'}
                  <span className="text-gray-400 font-normal ml-1">
                    ({vi ? 'tu\u1ef3 ch\u1ecdn' : 'optional'})
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={locationUrl}
                    onChange={(e) => setLocationUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap border border-gray-300"
                  >
                    {vi ? 'T\u00ecm tr\u00ean Maps' : 'Find on Maps'}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Platform + Meeting Link \u2014 online only */}
          {mode === 'online' && (
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
                    name="event-meeting-platform"
                    value={p}
                    checked={meetingPlatform === p}
                    onChange={() => setMeetingPlatform(p)}
                    className="sr-only"
                  />
                  {p === 'meet' && 'Google Meet'}
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
          )}

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
                  {(emailSubject !== defaultSubject || emailIntro !== buildDefaultIntro(mode)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSubject(defaultSubject);
                        setEmailIntro(buildDefaultIntro(mode));
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
                    {p.is_guest && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
                        {vi ? 'Khách' : 'Guest'}
                      </span>
                    )}
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
