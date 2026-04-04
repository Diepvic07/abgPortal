'use client';

import { useState, useEffect } from 'react';
import { EventPayment, EventGuestRsvp } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const PAYER_TYPE_LABELS: Record<string, string> = {
  premium: 'Premium',
  basic: 'Basic',
  guest: 'Guest',
};

export function AdminEventPayments({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const [guestRsvps, setGuestRsvps] = useState<EventGuestRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [eventId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [paymentsRes, guestRes] = await Promise.all([
        fetch(`/api/admin/community/events/${eventId}/payments`),
        fetch(`/api/admin/community/events/${eventId}/guest-rsvps`),
      ]);
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }
      if (guestRes.ok) {
        const data = await guestRes.json();
        setGuestRsvps(data.guest_rsvps || []);
      }
    } catch {
      console.error('Failed to fetch event payment data');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentAction(paymentId: string, status: 'confirmed' | 'rejected') {
    setActionLoading(paymentId);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { payment_id: paymentId, status };
      const editedAmount = editAmounts[paymentId];
      if (editedAmount && parseInt(editedAmount) > 0) {
        payload.amount_vnd = parseInt(editedAmount);
      }
      const res = await fetch(`/api/admin/community/events/${eventId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ text: `Payment ${status}`, type: 'success' });
        await fetchData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-3"><div className="h-6 bg-gray-200 rounded w-1/3" /><div className="h-32 bg-gray-200 rounded" /></div>;
  }

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const otherPayments = payments.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Payments & Guests — {eventTitle}
        </h3>
        <button onClick={fetchData} className="text-xs text-blue-600 hover:underline">Refresh</button>
      </div>

      {/* Revenue Summary */}
      {payments.length > 0 && (() => {
        const confirmed = payments.filter(p => p.status === 'confirmed');
        const pending = payments.filter(p => p.status === 'pending');
        const confirmedTotal = confirmed.reduce((s, p) => s + p.amount_vnd, 0);
        const pendingTotal = pending.reduce((s, p) => s + p.amount_vnd, 0);
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 font-medium">Confirmed</p>
              <p className="text-lg font-bold text-green-800">{new Intl.NumberFormat('vi-VN').format(confirmedTotal)}</p>
              <p className="text-xs text-green-600">{confirmed.length} payments</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-lg font-bold text-amber-800">{new Intl.NumberFormat('vi-VN').format(pendingTotal)}</p>
              <p className="text-xs text-amber-600">{pending.length} payments</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 font-medium">Total</p>
              <p className="text-lg font-bold text-blue-800">{new Intl.NumberFormat('vi-VN').format(confirmedTotal + pendingTotal)}</p>
              <p className="text-xs text-blue-600">{payments.length} payments</p>
            </div>
          </div>
        );
      })()}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Pending Payments ({pendingPayments.length})</h4>
          <div className="space-y-3">
            {pendingPayments.map((p) => (
              <div key={p.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{p.payer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{PAYER_TYPE_LABELS[p.payer_type]}</span>
                    </div>
                    <p className="text-sm text-gray-600">{p.payer_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        value={editAmounts[p.id] ?? String(p.amount_vnd)}
                        onChange={(e) => setEditAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-900"
                      />
                      <span className="text-sm text-gray-500">VND</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(p.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handlePaymentAction(p.id, 'confirmed')}
                      disabled={actionLoading === p.id}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handlePaymentAction(p.id, 'rejected')}
                      disabled={actionLoading === p.id}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed/Rejected Payments */}
      {otherPayments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History ({otherPayments.length})</h4>
          <div className="space-y-2">
            {otherPayments.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{p.payer_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{PAYER_TYPE_LABELS[p.payer_type]}</span>
                    </div>
                    <p className="text-xs text-gray-500">{p.payer_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        value={editAmounts[p.id] ?? String(p.amount_vnd)}
                        onChange={(e) => setEditAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-28 px-2 py-0.5 border border-gray-200 rounded text-xs font-medium text-gray-700"
                      />
                      <span className="text-xs text-gray-400">VND</span>
                      {editAmounts[p.id] && parseInt(editAmounts[p.id]) !== p.amount_vnd && (
                        <button
                          onClick={() => handlePaymentAction(p.id, p.status as 'confirmed' | 'rejected')}
                          disabled={actionLoading === p.id}
                          className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 && (
        <p className="text-sm text-gray-500">No payments yet.</p>
      )}

      {/* Guest RSVPs */}
      {guestRsvps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Guest Registrations ({guestRsvps.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2">Registered</th>
                </tr>
              </thead>
              <tbody>
                {guestRsvps.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">{g.guest_name}</td>
                    <td className="py-2 pr-4 text-gray-600">{g.guest_email}</td>
                    <td className="py-2 pr-4 text-gray-600">{g.guest_phone || '—'}</td>
                    <td className="py-2 text-gray-500 text-xs">
                      {new Date(g.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
