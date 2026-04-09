'use client';

import { useEffect } from 'react';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Auto-register service worker on mount (does NOT prompt for permission)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[push] Service worker registration failed:', err);
      });
    }
  }, []);

  return <>{children}</>;
}
