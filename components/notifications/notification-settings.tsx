'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePushNotification } from '@/lib/hooks/usePushNotification';
import { useTranslation } from '@/lib/i18n';

interface NotificationPreferences {
  connection_request: boolean;
  new_event: boolean;
  new_proposal: boolean;
  proposal_comment: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  connection_request: true,
  new_event: true,
  new_proposal: true,
  proposal_comment: true,
};

export function NotificationSettings() {
  const { permission, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotification();
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences);
        }
      } catch {
        // Use defaults
      }
      setPrefsLoading(false);
    }
    fetchPrefs();
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handlePrefToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    const updated = { ...preferences, [key]: newValue };
    setPreferences(updated);

    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
        showToast(t.notifications.saved);
      } else {
        // Revert on failure
        setPreferences(preferences);
      }
    } catch {
      setPreferences(preferences);
    }
    setSaving(false);
  };

  const isLoading = pushLoading || prefsLoading;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Push notification master toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t.notifications.pushEnabled}</h3>
            <p className="text-sm text-gray-500 mt-1">{t.notifications.pushDescription}</p>
          </div>
          <button
            onClick={handlePushToggle}
            disabled={isLoading || permission === 'denied' || permission === 'unsupported'}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={isSubscribed}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isSubscribed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {permission === 'denied' && (
          <p className="mt-3 text-sm text-red-600">{t.notifications.pushDenied}</p>
        )}
        {permission === 'unsupported' && (
          <p className="mt-3 text-sm text-amber-600">{t.notifications.pushUnsupported}</p>
        )}
      </div>

      {/* Individual notification type toggles */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {!isSubscribed && (
          <div className="p-4 bg-gray-50 rounded-t-xl">
            <p className="text-sm text-gray-500">{t.notifications.enableFirst}</p>
          </div>
        )}

        <ToggleRow
          label={t.notifications.connectionRequest}
          description={t.notifications.connectionDescription}
          checked={preferences.connection_request}
          onChange={() => handlePrefToggle('connection_request')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.newEvent}
          description={t.notifications.eventDescription}
          checked={preferences.new_event}
          onChange={() => handlePrefToggle('new_event')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.newProposal}
          description={t.notifications.proposalDescription}
          checked={preferences.new_proposal}
          onChange={() => handlePrefToggle('new_proposal')}
          disabled={!isSubscribed || saving || isLoading}
        />
        <ToggleRow
          label={t.notifications.proposalComment}
          description={t.notifications.commentDescription}
          checked={preferences.proposal_comment}
          onChange={() => handlePrefToggle('proposal_comment')}
          disabled={!isSubscribed || saving || isLoading}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
