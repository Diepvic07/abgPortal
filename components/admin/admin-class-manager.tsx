'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { AbgClass } from '@/types';

interface UnmappedClass {
  class_name: string;
  member_count: number;
}

export function AdminClassManager() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<AbgClass[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add form
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState(0);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/classes');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClasses(data.classes || []);
      setUnmapped(data.unmapped || []);
      setError(null);
    } catch {
      setError(t.admin.classes.loadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setActionLoading('add');
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), display_order: newOrder }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add');
      }
      setNewName('');
      setNewOrder(0);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.admin.classes.addClass);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, display_order: editOrder }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditingId(null);
      await fetchData();
    } catch {
      alert(t.admin.messages.failed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (cls: AbgClass) => {
    setActionLoading(cls.id);
    try {
      const res = await fetch(`/api/admin/classes/${cls.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cls.is_active }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      await fetchData();
    } catch {
      alert(t.admin.classes.toggleFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.classes.deleteConfirm)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchData();
    } catch {
      alert(t.admin.classes.deleteFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemap = async (oldClass: string, newClass: string) => {
    if (!newClass) return;
    setActionLoading(oldClass);
    try {
      const res = await fetch('/api/admin/classes/remap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_class: oldClass, new_class: newClass }),
      });
      if (!res.ok) throw new Error('Failed to remap');
      const data = await res.json();
      alert(t.admin.classes.remapSuccess.replace('{count}', String(data.remapped_count)).replace('{oldClass}', oldClass).replace('{newClass}', newClass));
      await fetchData();
    } catch {
      alert(t.admin.classes.remapFailed);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }
  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Unmapped Classes Section */}
      {unmapped.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orange-700 mb-3">
            {t.admin.classes.unmapped} ({unmapped.length})
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {t.admin.classes.unmappedHelp}
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-100">
                  <th className="px-4 py-2 text-left text-sm font-medium text-orange-800">{t.admin.classes.currentName}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-orange-800">{t.admin.classes.members}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-orange-800">{t.admin.classes.mapTo}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-200">
                {unmapped.map((u) => (
                  <UnmappedRow
                    key={u.class_name}
                    unmapped={u}
                    canonicalClasses={classes.filter(c => c.is_active)}
                    onRemap={handleRemap}
                    loading={actionLoading === u.class_name}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Canonical Classes Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t.admin.classes.canonical} ({classes.length})
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {t.admin.classes.canonicalHelp}
        </p>

        {/* Add new class */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={t.admin.classes.newClassName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder={t.admin.classes.order}
            value={newOrder}
            onChange={(e) => setNewOrder(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={actionLoading === 'add' || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading === 'add' ? '...' : t.admin.classes.addClass}
          </button>
        </div>

        {/* Classes table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">{t.admin.classes.order}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">{t.admin.labels.name}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">{t.admin.labels.status}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">{t.admin.labels.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classes.map((cls) => (
                <tr key={cls.id} className={`hover:bg-gray-50 ${!cls.is_active ? 'opacity-50' : ''}`}>
                  {editingId === cls.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${cls.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {cls.is_active ? t.admin.status.active : t.admin.status.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(cls.id)}
                            disabled={actionLoading === cls.id}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            {t.admin.actions.save}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            {t.admin.actions.cancel}
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-sm text-gray-500">{cls.display_order}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{cls.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${cls.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {cls.is_active ? t.admin.status.active : t.admin.status.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingId(cls.id); setEditName(cls.name); setEditOrder(cls.display_order); }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {t.admin.actions.edit}
                          </button>
                          <button
                            onClick={() => handleToggleActive(cls)}
                            disabled={actionLoading === cls.id}
                            className={`text-xs ${cls.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {cls.is_active ? t.admin.classes.deactivate : t.admin.classes.activate}
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            disabled={actionLoading === cls.id}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            {t.admin.actions.delete}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-component for unmapped class rows
function UnmappedRow({
  unmapped,
  canonicalClasses,
  onRemap,
  loading,
}: {
  unmapped: UnmappedClass;
  canonicalClasses: AbgClass[];
  onRemap: (oldClass: string, newClass: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');

  return (
    <tr className="hover:bg-orange-50/50">
      <td className="px-4 py-2 text-sm font-medium text-gray-900">
        &quot;{unmapped.class_name}&quot;
      </td>
      <td className="px-4 py-2 text-sm text-gray-600">{unmapped.member_count}</td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t.admin.classes.selectTarget}</option>
            {canonicalClasses.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => onRemap(unmapped.class_name, selected)}
            disabled={loading || !selected}
            className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? '...' : t.admin.classes.remap}
          </button>
        </div>
      </td>
    </tr>
  );
}
