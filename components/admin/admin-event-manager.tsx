'use client';

import { useState, useEffect } from 'react';
import { CommunityEvent, EventStatus, EventCategory, EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '@/types';
import { AdminImageUpload } from './admin-article-image-upload';
import { AdminEventPayments } from './admin-event-payments';
import { useTranslation } from '@/lib/i18n';
import * as XLSX from 'xlsx';

const CATEGORY_ICONS: Record<string, string> = {
  charity: '❤️', event: '🎉', learning: '📚', community_support: '🤝', networking: '🌐', other: '💡',
};

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const ALL_STATUSES: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];
const ALL_CATEGORIES: EventCategory[] = ['abg_talks', 'fieldtrip', 'networking', 'learning', 'webinar', 'event', 'community_support', 'abg_business_connect', 'other'];

type EventPreset = 'custom' | 'premium_free' | 'premium_paid' | 'all_members_free' | 'all_members_paid' | 'public_paid';

const EVENT_PRESETS: Record<EventPreset, Partial<EventForm>> = {
  custom: {},
  premium_free: {
    fee_premium: '0',
    fee_basic: '',
    fee_guest: '',
    capacity_basic: '0',
    capacity_guest: '0',
    is_public: false,
  },
  premium_paid: {
    fee_premium: '',
    fee_basic: '',
    fee_guest: '',
    capacity_basic: '0',
    capacity_guest: '0',
    is_public: false,
  },
  all_members_free: {
    fee_premium: '0',
    fee_basic: '0',
    fee_guest: '',
    capacity_guest: '0',
    is_public: false,
  },
  all_members_paid: {
    fee_premium: '',
    fee_basic: '',
    fee_guest: '',
    capacity_guest: '0',
    is_public: false,
  },
  public_paid: {
    fee_premium: '',
    fee_basic: '',
    fee_guest: '',
    is_public: true,
  },
};

interface EventForm {
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  event_date: string;
  event_end_date: string;
  location: string;
  location_url: string;
  capacity_premium: string;
  capacity_basic: string;
  capacity_guest: string;
  image_url: string;
  fee_premium: string;
  fee_basic: string;
  fee_guest: string;
  is_public: boolean;
  allow_cancellation: boolean;
  registration_closed: boolean;
  require_question: boolean;
  question_prompt: string;
  registration_deadline: string;
  payment_qr_url: string;
  payment_instructions: string;
}

const emptyForm: EventForm = {
  title: '',
  description: '',
  category: 'event',
  status: 'draft',
  event_date: '',
  event_end_date: '',
  location: '',
  location_url: '',
  capacity_premium: '',
  capacity_basic: '',
  capacity_guest: '',
  image_url: '',
  fee_premium: '',
  fee_basic: '',
  fee_guest: '',
  is_public: false,
  allow_cancellation: true,
  registration_closed: false,
  require_question: false,
  question_prompt: '',
  registration_deadline: '',
  payment_qr_url: '',
  payment_instructions: '',
};

// Convert UTC ISO string to local datetime-local input value
function utcToLocalInput(utcStr: string): string {
  const date = new Date(utcStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function AdminEventManager() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const [viewingPayments, setViewingPayments] = useState<CommunityEvent | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<CommunityEvent | null>(null);
  const [questions, setQuestions] = useState<Array<{ type: string; tier?: string; name: string; email?: string; phone?: string; question: string; created_at: string }>>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<EventPreset>('custom');
  const [presetMessage, setPresetMessage] = useState(false);
  const { t, locale } = useTranslation();

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/community/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      console.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingEvent(null);
    setForm(emptyForm);
    setSelectedPreset('custom');
    setPresetMessage(false);
    setShowForm(true);
  }

  function applyPreset(preset: EventPreset) {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setPresetMessage(false);
      return;
    }
    const overrides = EVENT_PRESETS[preset];
    setForm((f) => ({ ...f, ...overrides }));
    setPresetMessage(true);
  }

  function openEditForm(event: CommunityEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      event_date: event.event_date ? utcToLocalInput(event.event_date) : '',
      event_end_date: event.event_end_date ? utcToLocalInput(event.event_end_date) : '',
      location: event.location || '',
      location_url: event.location_url || '',
      capacity_premium: event.capacity_premium != null ? String(event.capacity_premium) : '',
      capacity_basic: event.capacity_basic != null ? String(event.capacity_basic) : '',
      capacity_guest: event.capacity_guest != null ? String(event.capacity_guest) : '',
      image_url: event.image_url || '',
      fee_premium: event.fee_premium != null ? String(event.fee_premium) : '',
      fee_basic: event.fee_basic != null ? String(event.fee_basic) : '',
      fee_guest: event.fee_guest != null ? String(event.fee_guest) : '',
      is_public: event.is_public || false,
      allow_cancellation: event.allow_cancellation !== false,
      registration_closed: event.registration_closed || false,
      require_question: event.require_question || false,
      question_prompt: event.question_prompt || '',
      registration_deadline: event.registration_deadline ? utcToLocalInput(event.registration_deadline) : '',
      payment_qr_url: event.payment_qr_url || '',
      payment_instructions: event.payment_instructions || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
    setForm(emptyForm);
  }

  async function openQuestions(event: CommunityEvent) {
    setViewingQuestions(event);
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/admin/community/events/${event.id}/questions`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }

  function exportQuestionsExcel() {
    if (!viewingQuestions || questions.length === 0) return;
    const data = questions.map((q) => ({
      'Type': q.type === 'member' ? 'Thành viên' : 'Khách',
      'Tier': q.tier || '',
      'Name': q.name,
      'Email': q.email || '',
      'Phone': q.phone || '',
      'Question': q.question,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-size columns
    const colWidths = Object.keys(data[0]).map((key) => {
      const maxLen = Math.max(key.length, ...data.map((r) => String((r as Record<string, string>)[key] || '').length));
      return { wch: Math.min(maxLen + 2, 60) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, `questions-${viewingQuestions.slug || viewingQuestions.id}.xlsx`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading('form');
    setMessage(null);

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      category: form.category,
      status: form.status,
      event_date: new Date(form.event_date).toISOString(),
    };

    if (form.event_end_date) payload.event_end_date = new Date(form.event_end_date).toISOString();
    else if (editingEvent) payload.event_end_date = null;

    if (form.location) payload.location = form.location;
    else if (editingEvent) payload.location = null;

    if (form.location_url) payload.location_url = form.location_url;
    else if (editingEvent) payload.location_url = null;

    if (form.capacity_premium !== '') payload.capacity_premium = parseInt(form.capacity_premium);
    else if (editingEvent) payload.capacity_premium = null;

    if (form.capacity_basic !== '') payload.capacity_basic = parseInt(form.capacity_basic);
    else if (editingEvent) payload.capacity_basic = null;

    if (form.image_url) payload.image_url = form.image_url;
    else if (editingEvent) payload.image_url = null;

    if (form.fee_premium !== '') payload.fee_premium = parseInt(form.fee_premium);
    else if (editingEvent) payload.fee_premium = null;

    if (form.fee_basic !== '') payload.fee_basic = parseInt(form.fee_basic);
    else if (editingEvent) payload.fee_basic = null;

    if (form.fee_guest !== '') payload.fee_guest = parseInt(form.fee_guest);
    else if (editingEvent) payload.fee_guest = null;

    if (form.capacity_guest !== '') payload.capacity_guest = parseInt(form.capacity_guest);
    else if (editingEvent) payload.capacity_guest = null;

    payload.is_public = form.is_public;
    payload.allow_cancellation = form.allow_cancellation;
    payload.registration_closed = form.registration_closed;
    payload.require_question = form.require_question;

    if (form.question_prompt) payload.question_prompt = form.question_prompt;
    else if (editingEvent) payload.question_prompt = null;

    if (form.registration_deadline) payload.registration_deadline = new Date(form.registration_deadline).toISOString();
    else if (editingEvent) payload.registration_deadline = null;

    if (form.payment_qr_url) payload.payment_qr_url = form.payment_qr_url;
    else if (editingEvent) payload.payment_qr_url = null;

    if (form.payment_instructions) payload.payment_instructions = form.payment_instructions;
    else if (editingEvent) payload.payment_instructions = null;

    try {
      const url = editingEvent
        ? `/api/admin/community/events/${editingEvent.id}`
        : '/api/admin/community/events';
      const method = editingEvent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ text: editingEvent ? t.admin.events.eventUpdated : t.admin.events.eventCreated, type: 'success' });
        closeForm();
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t.admin.events.saveFailed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleRegistration(eventId: string, currentlyClosed: boolean) {
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_closed: !currentlyClosed }),
      });
      if (res.ok) {
        setMessage({ text: !currentlyClosed ? (locale === 'vi' ? 'Đã đóng đăng ký' : 'Registration closed') : (locale === 'vi' ? 'Đã mở đăng ký' : 'Registration reopened'), type: 'success' });
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t.admin.events.saveFailed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage({ text: t.admin.events.statusChanged.replace('{status}', newStatus), type: 'success' });
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t.admin.events.saveFailed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(eventId: string, title: string) {
    if (!confirm(t.admin.events.deleteConfirm.replace('{title}', title))) return;
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: t.admin.events.eventDeleted, type: 'success' });
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t.admin.events.deleteFailed, type: 'error' });
      }
    } catch {
      setMessage({ text: t.admin.messages.somethingWrong, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  const filteredEvents = filterStatus === 'all'
    ? events
    : events.filter((e) => e.status === filterStatus);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t.admin.events.title} ({events.length})</h2>
        <button
          onClick={openCreateForm}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {t.admin.events.createEvent}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {t.admin.events.all}
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {EVENT_STATUS_LABELS[s].en}
          </button>
        ))}
      </div>

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {filterStatus === 'all' ? t.admin.events.noEvents : t.admin.events.noFilteredEvents.replace('{status}', filterStatus)}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{CATEGORY_ICONS[event.category] || '💡'}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[event.status]}`}>
                      {event.status}
                    </span>
                    {event.proposal_id && (
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{t.admin.members.fromProposal}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {event.event_date && (
                      <>
                        {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {event.event_end_date && (
                          <> &ndash; {new Date(event.event_end_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </>
                    )}
                    {event.location && <> · {event.location}</>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {event.rsvp_count} {t.admin.events.rsvps} · {t.admin.events.score} {event.rsvp_score} · {event.comment_count} {t.admin.events.comments}
                    {event.capacity_premium != null && <> · {t.admin.events.premiumSeats} {event.capacity_premium}</>}
                    {event.capacity_basic != null && <> · {t.admin.events.basicSeats} {event.capacity_basic}</>}
                    {(event.guest_rsvp_count || 0) > 0 && <> · {event.guest_rsvp_count} {t.admin.events.guests}</>}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {event.is_public && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{t.admin.events.publicBadge}</span>}
                    {event.fee_premium != null && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{t.admin.events.paidBadge}</span>}
                    {event.registration_closed && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{locale === 'vi' ? 'Đóng đăng ký' : 'Registration closed'}</span>}
                    {event.require_question && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{locale === 'vi' ? 'Yêu cầu câu hỏi' : 'Q&A required'}</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => openEditForm(event)}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                  >
                    {t.admin.actions.edit}
                  </button>
                  <select
                    value={event.status}
                    onChange={(e) => handleStatusChange(event.id, e.target.value as EventStatus)}
                    disabled={actionLoading === event.id}
                    className="text-xs px-3 py-1.5 border rounded-lg bg-white disabled:opacity-50"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {event.status === 'published' && (
                    <button
                      onClick={() => handleToggleRegistration(event.id, event.registration_closed || false)}
                      disabled={actionLoading === event.id}
                      className={`text-xs px-3 py-1.5 border rounded-lg disabled:opacity-50 ${
                        event.registration_closed
                          ? 'border-green-200 text-green-600 hover:bg-green-50'
                          : 'border-orange-200 text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {event.registration_closed
                        ? (locale === 'vi' ? 'Mở đăng ký' : 'Open Registration')
                        : (locale === 'vi' ? 'Đóng đăng ký' : 'Close Registration')}
                    </button>
                  )}
                  <button
                    onClick={() => setViewingPayments(event)}
                    className="text-xs px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    {t.admin.events.payments}
                  </button>
                  {event.require_question && (
                    <button
                      onClick={() => openQuestions(event)}
                      className="text-xs px-3 py-1.5 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50"
                    >
                      {locale === 'vi' ? 'Xuất danh sách' : 'Export List'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id, event.title)}
                    disabled={actionLoading === event.id}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {t.admin.actions.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEvent ? t.admin.events.editEvent : t.admin.events.createNewEvent}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                {/* Preset Selector (only for new events) */}
                {!editingEvent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formPreset}</label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ['custom', t.admin.events.presetCustom],
                        ['premium_free', t.admin.events.presetPremiumFree],
                        ['premium_paid', t.admin.events.presetPremiumPaid],
                        ['all_members_free', t.admin.events.presetAllMembersFree],
                        ['all_members_paid', t.admin.events.presetAllMembersPaid],
                        ['public_paid', t.admin.events.presetPublicPaid],
                      ] as [EventPreset, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyPreset(key)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            selectedPreset === key
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {presetMessage && (
                      <p className="text-xs text-green-600 mt-1">{t.admin.events.presetApplied}</p>
                    )}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formTitle}</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.admin.events.titlePlaceholder}
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formCategory}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EventCategory }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{EVENT_CATEGORY_LABELS[c].en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formStatus}</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EventStatus }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{EVENT_STATUS_LABELS[s].en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formDescription}</label>
                  <textarea
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={8}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    placeholder={t.admin.events.descriptionPlaceholder}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formStartDate}</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.event_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formEndDate}</label>
                    <input
                      type="datetime-local"
                      value={form.event_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Registration Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formRegistrationDeadline}</label>
                  <input
                    type="datetime-local"
                    value={form.registration_deadline}
                    onChange={(e) => setForm((f) => ({ ...f, registration_deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formLocation}</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.admin.events.locationPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formLocationUrl}</label>
                  <input
                    type="url"
                    value={form.location_url}
                    onChange={(e) => setForm((f) => ({ ...f, location_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formPremiumSeats}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.capacity_premium}
                      onChange={(e) => setForm((f) => ({ ...f, capacity_premium: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t.admin.events.unlimitedPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formBasicSeats}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.capacity_basic}
                      onChange={(e) => setForm((f) => ({ ...f, capacity_basic: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t.admin.events.premiumOnlyPlaceholder}
                    />
                  </div>
                </div>

                {/* Guest Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formGuestSeats}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.capacity_guest}
                    onChange={(e) => setForm((f) => ({ ...f, capacity_guest: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.admin.events.guestPlaceholder}
                  />
                </div>

                {/* Public Event Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{t.admin.events.formPublicEvent}</span>
                    <p className="text-xs text-gray-500">{t.admin.events.formPublicHelp}</p>
                  </div>
                </label>

                {/* Allow Cancellation Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allow_cancellation}
                    onChange={(e) => setForm((f) => ({ ...f, allow_cancellation: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{t.admin.events.formAllowCancellation}</span>
                    <p className="text-xs text-gray-500">{t.admin.events.formAllowCancellationHelp}</p>
                  </div>
                </label>

                {/* Close Registration Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.registration_closed}
                    onChange={(e) => setForm((f) => ({ ...f, registration_closed: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {locale === 'vi' ? 'Đóng đăng ký' : 'Close Registration'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {locale === 'vi' ? 'Ngừng nhận đăng ký mới. Người đã đăng ký vẫn giữ chỗ.' : 'Stop accepting new registrations. Existing RSVPs are preserved.'}
                    </p>
                  </div>
                </label>

                {/* Require Question Toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.require_question}
                    onChange={(e) => setForm((f) => ({ ...f, require_question: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {locale === 'vi' ? 'Bắt buộc gửi câu hỏi cho diễn giả' : 'Require question for speaker'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {locale === 'vi' ? 'Người tham gia phải gửi câu hỏi cho diễn giả trước khi đăng ký.' : 'Participants must submit a question for the speaker before joining.'}
                    </p>
                  </div>
                </label>

                {form.require_question && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === 'vi' ? 'Nội dung gợi ý câu hỏi (không bắt buộc)' : 'Custom question prompt (optional)'}
                    </label>
                    <input
                      type="text"
                      value={form.question_prompt}
                      onChange={(e) => setForm((f) => ({ ...f, question_prompt: e.target.value }))}
                      maxLength={500}
                      placeholder={locale === 'vi' ? 'Ví dụ: Bạn muốn hỏi diễn giả điều gì?' : 'e.g. What would you like to ask the speaker?'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Event Fees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formFees}</label>
                  <p className="text-xs text-gray-500 mb-2">{t.admin.events.formFeesHelp}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t.admin.labels.premium}</label>
                      <input
                        type="number"
                        min="0"
                        value={form.fee_premium}
                        onChange={(e) => setForm((f) => ({ ...f, fee_premium: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.admin.events.freePlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t.admin.labels.basic}</label>
                      <input
                        type="number"
                        min="0"
                        value={form.fee_basic}
                        onChange={(e) => setForm((f) => ({ ...f, fee_basic: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.admin.events.freePlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t.admin.labels.guest}</label>
                      <input
                        type="number"
                        min="0"
                        value={form.fee_guest}
                        onChange={(e) => setForm((f) => ({ ...f, fee_guest: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.admin.events.freePlaceholder}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment QR & Instructions (only show if any fee is set) */}
                {(form.fee_premium || form.fee_basic || form.fee_guest) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formPaymentQr}</label>
                      <input
                        type="url"
                        value={form.payment_qr_url}
                        onChange={(e) => setForm((f) => ({ ...f, payment_qr_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t.admin.events.formPaymentQrPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.events.formPaymentInstructions}</label>
                      <textarea
                        rows={2}
                        value={form.payment_instructions}
                        onChange={(e) => setForm((f) => ({ ...f, payment_instructions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                        placeholder={t.admin.events.paymentInstructionsPlaceholder}
                      />
                    </div>
                  </>
                )}

                {/* Event Image */}
                <AdminImageUpload
                  imageUrl={form.image_url}
                  onImageChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  uploadEndpoint="/api/admin/community/events/upload-image"
                  onUploadingChange={setImageUploading}
                />
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {t.admin.actions.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'form' || imageUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {imageUploading ? t.admin.events.formUploading : actionLoading === 'form' ? t.admin.actions.saving : editingEvent ? t.admin.events.formSaveChanges : t.admin.events.formCreateEvent}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {viewingQuestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {locale === 'vi' ? 'Câu hỏi cho diễn giả' : 'Questions for Speaker'}
                </h2>
                <p className="text-sm text-gray-500">{viewingQuestions.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportQuestionsExcel}
                  disabled={questions.length === 0}
                  className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locale === 'vi' ? 'Xuất Excel' : 'Export Excel'}
                </button>
                <button onClick={() => setViewingQuestions(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              {questionsLoading ? (
                <p className="text-sm text-gray-500 text-center py-8">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
              ) : questions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{locale === 'vi' ? 'Chưa có câu hỏi nào.' : 'No questions yet.'}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">{questions.length} {locale === 'vi' ? 'câu hỏi' : 'question(s)'}</p>
                  {questions.map((q, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{q.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${q.tier === 'Premium' ? 'bg-amber-50 text-amber-700' : q.type === 'member' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {q.tier || (q.type === 'member' ? 'Basic' : 'Guest')}
                          </span>
                        </div>
                      </div>
                      {q.email && <p className="text-xs text-gray-400 mb-0.5">{q.email}</p>}
                      {q.phone && <p className="text-xs text-gray-400 mb-1">{q.phone}</p>}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.question}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments & Guests Modal */}
      {viewingPayments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{t.admin.eventPayments.title}</h2>
              <button onClick={() => setViewingPayments(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              <AdminEventPayments eventId={viewingPayments.id} eventTitle={viewingPayments.title} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
