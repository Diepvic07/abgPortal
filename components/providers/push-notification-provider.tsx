'use client';

import { useEffect } from 'react';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function initAndRepair() {
      if (!('serviceWorker' in navigator)) return;

      // Auto-register service worker on mount (does NOT prompt for permission)
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.warn('[push] Service worker registration failed:', err);
        return;
      }

      // If user previously granted permission and has an active subscription,
      // verify it still exists server-side and re-register if the server lost it.
      // This prevents silent push death when iOS cleans up the subscription.
      if (!('PushManager' in window) || Notification.permission !== 'granted') return;

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!registration) return;

        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`);
        if (!res.ok) return;

        const { exists } = await res.json();
        if (exists) return; // All good — server has the subscription

        // Server lost the subscription — re-register it silently
        console.log('[push] Server subscription missing, re-registering on app open...');
        const keys = subscription.toJSON().keys;
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: keys?.p256dh,
            auth: keys?.auth,
          }),
        });
      } catch {
        // Non-critical — don't break the app
      }
    }

    initAndRepair();
  }, []);

  return <>{children}</>;
}
