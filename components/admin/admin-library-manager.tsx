'use client';

import { useEffect, useState } from 'react';
import type { CommunityEvent, CommunityProposal, LibraryItem, LibraryItemStatus, LibraryResourceLink } from '@/types';

type LibraryForm = {
  title: string;
  description: string;
  linked_ref: string;
  drive_url: string;
  thumbnail_url: string;
  resource_links_text: string;
  duration_text: string;
  speaker_name: string;
  recorded_at: string;
  status: LibraryItemStatus;
};

const emptyForm: LibraryForm = {
  title: '',
  description: '',
  linked_ref: '',
  drive_url: '',
  thumbnail_url: '',
  resource_links_text: '',
  duration_text: '',
  speaker_name: '',
  recorded_at: '',
  status: 'draft',
};

function encodeLinkedRef(item: LibraryItem | null): string {
  if (!item) return '';
  if (item.event_id) return `event:${item.event_id}`;
  if (item.proposal_id) return `proposal:${item.proposal_id}`;
  return '';
}

function parseLinkedRef(value: string): { event_id: string | null; proposal_id: string | null } {
  if (value.startsWith('event:')) return { event_id: value.slice(6), proposal_id: null };
  if (value.startsWith('proposal:')) return { event_id: null, proposal_id: value.slice(9) };
  return { event_id: null, proposal_id: null };
}

const STATUS_LABELS: Record<LibraryItemStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

function resourceLinksToText(links: LibraryResourceLink[]): string {
  return links.map((link) => `${link.label} | ${link.url}`).join('\n');
}

function parseResourceLinksText(value: string): LibraryResourceLink[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, ...urlParts] = line.split('|');
      const label = labelPart.trim();
      const url = urlParts.join('|').trim();
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((link): link is LibraryResourceLink => Boolean(link));
}

function toDateInput(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function AdminLibraryManager() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [proposals, setProposals] = useState<CommunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [form, setForm] = useState<LibraryForm>(emptyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [libraryRes, eventsRes, proposalsRes] = await Promise.all([
        fetch('/api/admin/library'),
        fetch('/api/admin/community/events'),
        fetch('/api/admin/community/proposals'),
      ]);

      if (libraryRes.ok) {
        const data = await libraryRes.json();
        setItems(data.library_items || []);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }

      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch library data:', error);
      setMessage({ type: 'error', text: 'Unable to load library items.' });
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingItem(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage(null);
  }

  function openEditForm(item: LibraryItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description,
      linked_ref: encodeLinkedRef(item),
      drive_url: item.drive_file_id || '',
      thumbnail_url: item.thumbnail_url || '',
      resource_links_text: resourceLinksToText(item.resource_links),
      duration_text: item.duration_text || '',
      speaker_name: item.speaker_name || '',
      recorded_at: toDateInput(item.recorded_at),
      status: item.status,
    });
    setShowForm(true);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const linked = parseLinkedRef(form.linked_ref);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_id: linked.event_id,
        proposal_id: linked.proposal_id,
        drive_url: form.drive_url.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        resource_links: parseResourceLinksText(form.resource_links_text),
        duration_text: form.duration_text.trim() || null,
        speaker_name: form.speaker_name.trim() || null,
        recorded_at: form.recorded_at || null,
        status: form.status,
      };

      const res = await fetch(editingItem ? `/api/admin/library/${editingItem.id}` : '/api/admin/library', {
        method: editingItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ type: 'error', text: data?.error || 'Unable to save library item.' });
        return;
      }

      setMessage({ type: 'success', text: editingItem ? 'Library item updated.' : 'Library item created.' });
      setShowForm(false);
      setEditingItem(null);
      setForm(emptyForm);
      await fetchData();
    } catch (error) {
      console.error('Failed to save library item:', error);
      setMessage({ type: 'error', text: 'Unable to save library item.' });
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(item: LibraryItem) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/library/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage({ type: 'error', text: data?.error || 'Unable to archive item.' });
        return;
      }

      setMessage({ type: 'success', text: 'Library item archived.' });
      await fetchData();
    } catch (error) {
      console.error('Failed to archive library item:', error);
      setMessage({ type: 'error', text: 'Unable to archive item.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading library...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Library / Thư viện</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage Google Drive workshop recordings, slides, and resources for Premium members.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Add Library Item
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{editingItem ? 'Edit Library Item' : 'New Library Item'}</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2 block">
              <span className="text-sm font-medium text-gray-700">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="md:col-span-2 block">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                required
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Linked Event / Proposal</span>
              <select
                value={form.linked_ref}
                onChange={(e) => setForm((prev) => ({ ...prev, linked_ref: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">No linked event</option>
                {events.length > 0 && (
                  <optgroup label="Events">
                    {events.map((event) => (
                      <option key={`event-${event.id}`} value={`event:${event.id}`}>
                        {event.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {proposals.length > 0 && (
                  <optgroup label="Completed Proposals">
                    {proposals.map((proposal) => (
                      <option key={`proposal-${proposal.id}`} value={`proposal:${proposal.id}`}>
                        {proposal.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as LibraryItemStatus }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="md:col-span-2 block">
              <span className="text-sm font-medium text-gray-700">Google Drive video link or file ID</span>
              <input
                value={form.drive_url}
                onChange={(e) => setForm((prev) => ({ ...prev, drive_url: e.target.value }))}
                placeholder="https://drive.google.com/file/d/.../view or file ID"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Speaker</span>
              <input
                value={form.speaker_name}
                onChange={(e) => setForm((prev) => ({ ...prev, speaker_name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Duration</span>
              <input
                value={form.duration_text}
                onChange={(e) => setForm((prev) => ({ ...prev, duration_text: e.target.value }))}
                placeholder="1h 30m"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Recorded Date</span>
              <input
                type="date"
                value={form.recorded_at}
                onChange={(e) => setForm((prev) => ({ ...prev, recorded_at: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Thumbnail URL</span>
              <input
                value={form.thumbnail_url}
                onChange={(e) => setForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="md:col-span-2 block">
              <span className="text-sm font-medium text-gray-700">Slides/resource links</span>
              <textarea
                value={form.resource_links_text}
                onChange={(e) => setForm((prev) => ({ ...prev, resource_links_text: e.target.value }))}
                rows={4}
                placeholder="Slide deck | https://..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">One link per line. Format: Label | URL</p>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full min-w-[900px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Event</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Resources</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No library items yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="mt-1 text-sm text-gray-500">{item.speaker_name || 'No speaker'}{item.duration_text ? ` · ${item.duration_text}` : ''}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{item.event_title || item.proposal_title || '-'}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{item.resource_links.length}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {item.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => archiveItem(item)}
                          disabled={saving}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
