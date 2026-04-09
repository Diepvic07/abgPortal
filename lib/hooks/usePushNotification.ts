'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotification() {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check current state on mount
  useEffect(() => {
    async function checkState() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      setPermission(Notification.permission as PushPermission);

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch {
        // Service worker not registered yet
      }

      setLoading(false);
    }

    checkState();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    setLoading(true);

    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);

      if (result !== 'granted') {
        setLoading(false);
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('[push] VAPID public key not configured');
        setLoading(false);
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      const keys = subscription.toJSON().keys;
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys?.p256dh,
          auth: keys?.auth,
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setLoading(false);
        return true;
      }

      // If server save failed, unsubscribe from browser too
      await subscription.unsubscribe();
      setLoading(false);
      return false;
    } catch (err) {
      console.error('[push] Subscribe error:', err);
      setLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Notify server
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });

          // Unsubscribe from browser
          await subscription.unsubscribe();
        }
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[push] Unsubscribe error:', err);
      setLoading(false);
      return false;
    }
  }, []);

  return { permission, isSubscribed, subscribe, unsubscribe, loading };
}
