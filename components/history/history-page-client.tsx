'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RequestHistoryList } from './history-request-list-display';
import { IncomingMatchesList } from './history-incoming-matches-list-display';

type TabType = 'requests' | 'incoming';
type StatusFilter = 'all' | 'pending' | 'matched' | 'connected' | 'declined';
type DateFilter = 0 | 7 | 30;

interface EnrichedRequest {
  id: string;
  request_text: string;
  status: 'pending' | 'matched' | 'connected' | 'declined';
  created_at: string;
  matched_member: {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar_url?: string;
  } | null;
}

interface EnrichedConnection {
  id: string;
  created_at: string;
  request_text: string;
  requester: {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar_url?: string;
  } | null;
}

export function HistoryPageClient() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>(0);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter, dateFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        days: dateFilter.toString(),
      });

      if (activeTab === 'requests' && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/history?${params}`);
      const data = await response.json();

      if (data.success) {
        if (activeTab === 'requests') {
          setRequests(data.requests || []);
        } else {
          setConnections(data.connections || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{t.history.title}</h1>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'requests'
                    ? 'border-brand text-brand bg-brand/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.history.myRequests}
              </button>
              <button
                onClick={() => setActiveTab('incoming')}
                className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'incoming'
                    ? 'border-brand text-brand bg-brand/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.history.incomingMatches}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4">
              {/* Status Filter - Only for requests tab */}
              {activeTab === 'requests' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="rounded-md border-gray-300 text-sm focus:ring-brand focus:border-brand"
                  >
                    <option value="all">{t.history.filterAll}</option>
                    <option value="pending">{t.history.status.pending}</option>
                    <option value="matched">{t.history.status.matched}</option>
                    <option value="connected">{t.history.status.connected}</option>
                    <option value="declined">{t.history.status.declined}</option>
                  </select>
                </div>
              )}

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(parseInt(e.target.value) as DateFilter)}
                  className="rounded-md border-gray-300 text-sm focus:ring-brand focus:border-brand"
                >
                  <option value="0">{t.history.dateAll}</option>
                  <option value="7">{t.history.dateLast7}</option>
                  <option value="30">{t.history.dateLast30}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="py-12">
                <LoadingSpinner size="lg" text={t.common.loading} />
              </div>
            ) : activeTab === 'requests' ? (
              <RequestHistoryList requests={requests} />
            ) : (
              <IncomingMatchesList connections={connections} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
