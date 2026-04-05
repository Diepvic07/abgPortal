'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LoveMatchRequest, RequestCategory } from '@/types';
import { RequestHistoryList } from './history-request-list-display';
import { IncomingMatchesList } from './history-incoming-matches-list-display';
import { ContactRequestsTab } from './contact-requests-tab';

type TabType = 'requests' | 'incoming' | 'contacts';
type StatusFilter = 'all' | 'pending' | 'matched' | 'connected' | 'declined';
type DateFilter = 0 | 7 | 30;

interface EnrichedRequest {
  id: string;
  request_text: string;
  status: 'pending' | 'matched' | 'connected' | 'declined';
  created_at: string;
  category?: RequestCategory;
  matched_member: {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar_url?: string;
    public_profile_slug?: string;
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
    public_profile_slug?: string;
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
  const [outgoingLoveMatches, setOutgoingLoveMatches] = useState<LoveMatchRequest[]>([]);
  const [incomingLoveMatches, setIncomingLoveMatches] = useState<LoveMatchRequest[]>([]);
  const [loveMatchLoadingId, setLoveMatchLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
          setOutgoingLoveMatches(data.love_matches || []);
        } else {
          setConnections(data.connections || []);
          setIncomingLoveMatches(data.love_matches || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLoveMatchRespond(id: string, action: 'accept' | 'refuse') {
    setLoveMatchLoadingId(id);
    try {
      const res = await fetch('/api/love-match/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ love_match_id: id, action }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to respond to love match:', error);
    } finally {
      setLoveMatchLoadingId(null);
    }
  }

  const outgoingCount = requests.length + outgoingLoveMatches.length;
  const incomingCount = connections.length + incomingLoveMatches.length;

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
                className={`flex-1 px-4 sm:px-6 py-3.5 text-sm font-semibold border-b-3 transition-all ${
                  activeTab === 'requests'
                    ? 'border-brand text-brand bg-brand/10 border-b-[3px]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                Outgoing
                {!loading && outgoingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/20 text-brand text-xs font-bold">
                    {outgoingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('incoming')}
                className={`flex-1 px-4 sm:px-6 py-3.5 text-sm font-semibold border-b-3 transition-all ${
                  activeTab === 'incoming'
                    ? 'border-brand text-brand bg-brand/10 border-b-[3px]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                Incoming
                {!loading && incomingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/20 text-brand text-xs font-bold">
                    {incomingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 px-4 sm:px-6 py-3.5 text-sm font-semibold border-b-3 transition-all ${
                  activeTab === 'contacts'
                    ? 'border-brand text-brand bg-brand/10 border-b-[3px]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                Contacts
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4">
              {/* Status Filter — only for outgoing tab */}
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
            ) : activeTab === 'contacts' ? (
              <ContactRequestsTab />
            ) : activeTab === 'requests' ? (
              <div className="space-y-8">
                <RequestHistoryList requests={requests} />
                {outgoingLoveMatches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span>Love Match Requests Sent</span>
                      <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full border border-pink-200">
                        {outgoingLoveMatches.length}
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {outgoingLoveMatches.map((lm) => {
                        const isPending = lm.status === 'pending';
                        const statusLabel =
                          lm.status === 'accepted' ? 'Matched!' :
                          lm.status === 'refused' ? 'Not a match' :
                          lm.status === 'ignored' ? 'Expired' :
                          'Waiting for response';
                        const statusClasses =
                          lm.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                          lm.status === 'refused' ? 'bg-red-100 text-red-800 border-red-200' :
                          lm.status === 'ignored' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                          'bg-yellow-100 text-yellow-800 border-yellow-200';

                        return (
                          <div
                            key={lm.id}
                            className={`border border-pink-100 rounded-xl p-4 shadow-sm ${
                              !isPending ? 'opacity-60 bg-gray-50' : 'bg-white hover:shadow-md transition-shadow'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Love match request
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClasses}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Sent {new Date(lm.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <IncomingMatchesList
                connections={connections}
                loveMatches={incomingLoveMatches}
                onLoveMatchRespond={handleLoveMatchRespond}
                loveMatchLoadingId={loveMatchLoadingId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
