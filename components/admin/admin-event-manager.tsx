'use client';

import { useState, useEffect } from 'react';
import { CommunityEvent, EventStatus, EventCategory, EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '@/types';
import { AdminImageUpload } from './admin-article-image-upload';

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
const ALL_CATEGORIES: EventCategory[] = ['charity', 'event', 'learning', 'community_support', 'networking', 'other'];

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
  image_url: string;
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
  image_url: '',
};

export function AdminEventManager() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

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
    setShowForm(true);
  }

  function openEditForm(event: CommunityEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      event_end_date: event.event_end_date ? new Date(event.event_end_date).toISOString().slice(0, 16) : '',
      location: event.location || '',
      location_url: event.location_url || '',
      capacity_premium: event.capacity_premium != null ? String(event.capacity_premium) : '',
      capacity_basic: event.capacity_basic != null ? String(event.capacity_basic) : '',
      image_url: event.image_url || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
    setForm(emptyForm);
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
        setMessage({ text: editingEvent ? 'Event updated' : 'Event created', type: 'success' });
        closeForm();
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to save event', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' });
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
        setMessage({ text: `Status changed to ${newStatus}`, type: 'success' });
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to update status', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(eventId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/admin/community/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Event deleted', type: 'success' });
        await fetchEvents();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to delete event', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' });
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
        <h2 className="text-xl font-bold text-gray-900">Community Events ({events.length})</h2>
        <button
          onClick={openCreateForm}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Create Event
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
          All
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
          {filterStatus === 'all' ? 'No events yet. Create your first event!' : `No ${filterStatus} events`}
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
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">From Proposal</span>
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
                    {event.rsvp_count} RSVPs · Score: {event.rsvp_score} · {event.comment_count} comments
                    {event.capacity_premium != null && <> · Premium seats: {event.capacity_premium}</>}
                    {event.capacity_basic != null && <> · Basic seats: {event.capacity_basic}</>}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => openEditForm(event)}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                  >
                    Edit
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
                  <button
                    onClick={() => handleDelete(event.id, event.title)}
                    disabled={actionLoading === event.id}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Event title"
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    placeholder="Describe the event (min 20 characters)"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.event_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.event_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, event_end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Cafe/Bar, District 1, HCMC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location URL</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premium Seats</label>
                    <input
                      type="number"
                      min="0"
                      value={form.capacity_premium}
                      onChange={(e) => setForm((f) => ({ ...f, capacity_premium: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Basic Seats</label>
                    <input
                      type="number"
                      min="0"
                      value={form.capacity_basic}
                      onChange={(e) => setForm((f) => ({ ...f, capacity_basic: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty for unlimited, 0 = Premium only"
                    />
                  </div>
                </div>

                {/* Event Image */}
                <AdminImageUpload
                  imageUrl={form.image_url}
                  onImageChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  uploadEndpoint="/api/admin/community/events/upload-image"
                />
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'form'}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {actionLoading === 'form' ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
