'use client';

import { useState, useEffect } from 'react';
import { MonthlyPnLRow, FinancialSettings, FinancialTransaction, ExpenseCategory, EXPENSE_CATEGORY_LABELS } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_CATEGORIES: ExpenseCategory[] = ['hosting', 'cloud_server', 'ai', 'event', 'operational', 'other'];

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function AdminFinanceDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [months, setMonths] = useState<MonthlyPnLRow[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Expense form
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('operational');
  const [expAmount, setExpAmount] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expLoading, setExpLoading] = useState(false);

  // Settings form
  const [settingsBalance, setSettingsBalance] = useState('0');
  const [settingsDate, setSettingsDate] = useState('2026-01-01');
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [year]);

  async function fetchData() {
    setLoading(true);
    try {
      const [pnlRes, txRes] = await Promise.all([
        fetch(`/api/admin/finance/pnl?year=${year}`),
        fetch(`/api/admin/finance/transactions?year=${year}`),
      ]);
      if (pnlRes.ok) {
        const data = await pnlRes.json();
        setMonths(data.months || []);
        setSettings(data.settings || null);
        if (data.settings) {
          setSettingsBalance(String(data.settings.opening_balance_vnd));
          setSettingsDate(data.settings.opening_balance_date);
        }
      }
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      console.error('Failed to fetch finance data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setExpLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expCategory,
          amount_vnd: parseInt(expAmount),
          description: expDescription,
          transaction_date: expDate,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Expense added', type: 'success' });
        setExpAmount('');
        setExpDescription('');
        setShowAddExpense(false);
        await fetchData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' });
    } finally {
      setExpLoading(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`/api/admin/finance/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Expense deleted', type: 'success' });
        await fetchData();
      }
    } catch {
      setMessage({ text: 'Failed to delete', type: 'error' });
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/finance/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_balance_vnd: parseInt(settingsBalance),
          opening_balance_date: settingsDate,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Settings saved', type: 'success' });
        setShowSettings(false);
        await fetchData();
      }
    } catch {
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  }

  // Compute YTD totals from months data
  const ytdRow = months.length > 0 ? months[months.length - 1] : null;
  const lastMonthWithData = [...months].reverse().find(m => m.total_revenue > 0 || m.total_expenses > 0);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-64 bg-gray-200 rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Financial Dashboard</h2>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="text-sm border rounded-lg px-3 py-1.5"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          >
            Settings
          </button>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">YTD Revenue</p>
          <p className="text-lg font-bold text-green-800">{formatVnd(ytdRow?.ytd_revenue || 0)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium">YTD Expenses</p>
          <p className="text-lg font-bold text-red-800">{formatVnd(ytdRow?.ytd_expenses || 0)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${(ytdRow?.ytd_net || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs font-medium" style={{ color: (ytdRow?.ytd_net || 0) >= 0 ? '#2563eb' : '#d97706' }}>YTD Net</p>
          <p className="text-lg font-bold" style={{ color: (ytdRow?.ytd_net || 0) >= 0 ? '#1e40af' : '#92400e' }}>
            {formatVnd(ytdRow?.ytd_net || 0)}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-600 font-medium">Cash Balance</p>
          <p className="text-lg font-bold text-gray-900">{formatVnd(lastMonthWithData?.running_balance ?? settings?.opening_balance_vnd ?? 0)}</p>
        </div>
      </div>

      {/* Settings Form */}
      {showSettings && (
        <form onSubmit={handleSaveSettings} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Opening Balance Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opening Balance (VND)</label>
              <input
                type="number"
                value={settingsBalance}
                onChange={(e) => setSettingsBalance(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={settingsDate}
                onChange={(e) => setSettingsDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={settingsLoading} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {settingsLoading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowSettings(false)} className="text-xs px-3 py-1.5 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Add Expense Form */}
      {showAddExpense && (
        <form onSubmit={handleAddExpense} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Add Expense</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (VND)</label>
              <input
                type="number"
                required
                min="1"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                required
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                required
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Monthly hosting fee"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={expLoading} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {expLoading ? 'Adding...' : 'Add Expense'}
            </button>
            <button type="button" onClick={() => setShowAddExpense(false)} className="text-xs px-3 py-1.5 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Monthly PnL Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium text-right">Membership</th>
              <th className="px-4 py-3 font-medium text-right">Events</th>
              <th className="px-4 py-3 font-medium text-right text-green-600">Revenue</th>
              <th className="px-4 py-3 font-medium text-right text-red-600">Expenses</th>
              <th className="px-4 py-3 font-medium text-right">Net</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {months.map((row, i) => {
              const hasData = row.total_revenue > 0 || row.total_expenses > 0;
              return (
                <tr key={row.month} className={`border-b ${hasData ? '' : 'text-gray-300'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{MONTHS[i]} {year}</td>
                  <td className="px-4 py-2.5 text-right">{hasData ? formatVnd(row.membership_revenue) : '—'}</td>
                  <td className="px-4 py-2.5 text-right">{hasData ? formatVnd(row.event_revenue) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-green-700 font-medium">{hasData ? formatVnd(row.total_revenue) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-red-700 font-medium">{hasData ? formatVnd(row.total_expenses) : '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${row.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {hasData ? formatVnd(row.net) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {hasData ? formatVnd(row.running_balance) : '—'}
                  </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-gray-50 font-semibold border-t-2">
              <td className="px-4 py-3 text-gray-900">YTD Total</td>
              <td className="px-4 py-3 text-right">{formatVnd(months.reduce((s, m) => s + m.membership_revenue, 0))}</td>
              <td className="px-4 py-3 text-right">{formatVnd(months.reduce((s, m) => s + m.event_revenue, 0))}</td>
              <td className="px-4 py-3 text-right text-green-700">{formatVnd(ytdRow?.ytd_revenue || 0)}</td>
              <td className="px-4 py-3 text-right text-red-700">{formatVnd(ytdRow?.ytd_expenses || 0)}</td>
              <td className={`px-4 py-3 text-right ${(ytdRow?.ytd_net || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatVnd(ytdRow?.ytd_net || 0)}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">{formatVnd(lastMonthWithData?.running_balance ?? settings?.opening_balance_vnd ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recent Expenses */}
      {transactions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Expenses ({transactions.length})</h3>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{EXPENSE_CATEGORY_LABELS[tx.category]}</span>
                    <span className="text-sm font-medium text-gray-900">{formatVnd(tx.amount_vnd)} VND</span>
                    <span className="text-xs text-gray-500">{tx.transaction_date}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{tx.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteTransaction(tx.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
